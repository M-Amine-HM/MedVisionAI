from __future__ import annotations

import base64
import io
import json
from pathlib import Path
from typing import Dict

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import models, transforms
import timm

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
RESULTS_PATH = MODEL_DIR / "results" / "ensemble_results.json"
RESNET_WEIGHTS = MODEL_DIR / "models" / "best_resnet18_advanced.pth"
VIT_WEIGHTS = MODEL_DIR / "models" / "best_vit_advanced.pth"

CLASS_NAMES = ["COVID19", "Normal", "Pneumonia", "Tuberculosis"]
NUM_CLASSES = len(CLASS_NAMES)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class AdvancedResNet(nn.Module):
    def __init__(self, num_classes: int, dropout: float = 0.5) -> None:
        super().__init__()
        self.backbone = models.resnet18(pretrained=False)
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(p=dropout * 0.5),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        return self.backbone(x)


class EnsembleModel(nn.Module):
    def __init__(self, resnet, vit, weights=None) -> None:
        super().__init__()
        self.resnet = resnet
        self.vit = vit
        self.weights = torch.tensor(weights or [0.5, 0.5], device=DEVICE)
        self.resnet.eval()
        self.vit.eval()

    def forward(self, x_resnet, x_vit):
        with torch.no_grad():
            resnet_out = torch.softmax(self.resnet(x_resnet), dim=1)
            vit_out = torch.softmax(self.vit(x_vit), dim=1)
            return self.weights[0] * resnet_out + self.weights[1] * vit_out


transform_resnet = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[
                             0.229, 0.224, 0.225]),
    ]
)

transform_vit = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
    ]
)


def _load_weights(path: Path) -> Dict:
    if not path.exists():
        raise RuntimeError(f"Missing model file: {path}")
    return torch.load(str(path), map_location=DEVICE)


def _load_ensemble_weights() -> list[float]:
    if not RESULTS_PATH.exists():
        return [0.5, 0.5]
    with RESULTS_PATH.open("r", encoding="utf-8") as file:
        results = json.load(file)
    weights = results.get("weights", {})
    return [float(weights.get("resnet", 0.5)), float(weights.get("vit", 0.5))]


def _load_models():
    resnet = AdvancedResNet(num_classes=NUM_CLASSES, dropout=0.5).to(DEVICE)
    resnet.load_state_dict(_load_weights(RESNET_WEIGHTS))
    resnet.eval()

    vit = timm.create_model(
        "vit_small_patch16_224", pretrained=False, num_classes=NUM_CLASSES
    ).to(DEVICE)
    vit.load_state_dict(_load_weights(VIT_WEIGHTS))
    vit.eval()

    ensemble_weights = _load_ensemble_weights()
    ensemble = EnsembleModel(resnet, vit, weights=ensemble_weights).to(DEVICE)
    return resnet, vit, ensemble


resnet_model, vit_model, ensemble_model = _load_models()


def _generate_gradcam_map(pil_image: Image.Image) -> np.ndarray:
    resnet_model.zero_grad(set_to_none=True)
    activations = []
    gradients = []

    target_layer = resnet_model.backbone.layer4

    def _forward_hook(_, __, output):
        activations.append(output)

    def _backward_hook(_, __, grad_output):
        gradients.append(grad_output[0])

    handle_forward = target_layer.register_forward_hook(_forward_hook)
    handle_backward = target_layer.register_full_backward_hook(_backward_hook)

    input_resnet = transform_resnet(pil_image).unsqueeze(0).to(DEVICE)
    scores = resnet_model(input_resnet)
    class_idx = int(torch.argmax(scores, dim=1).item())
    scores[0, class_idx].backward()

    handle_forward.remove()
    handle_backward.remove()

    if not activations or not gradients:
        raise RuntimeError("Grad-CAM failed to capture activations.")

    grads = gradients[0]
    acts = activations[0]
    weights = torch.mean(grads, dim=(2, 3), keepdim=True)
    cam = torch.relu(torch.sum(weights * acts, dim=1)).squeeze(0)
    cam -= cam.min()
    cam /= (cam.max() + 1e-8)

    cam = cam.unsqueeze(0).unsqueeze(0)
    cam = F.interpolate(
        cam,
        size=(pil_image.height, pil_image.width),
        mode="bilinear",
        align_corners=False,
    )
    cam_np = cam.squeeze(0).squeeze(0).detach().cpu().numpy()
    cam_np -= cam_np.min()
    cam_np /= (cam_np.max() + 1e-8)
    return cam_np


def _extract_points(
    cam_map: np.ndarray,
    image_size,
    max_points: int = 12,
    min_distance: int = 10,
) -> dict:
    height, width = cam_map.shape
    threshold = float(max(np.percentile(cam_map, 92), 0.55))
    working = cam_map.copy()
    points = []

    for _ in range(max_points):
        row, col = np.unravel_index(np.argmax(working), working.shape)
        score = float(working[row, col])
        if score < threshold:
            break

        radius = int(4 + (1 - score) * 8)
        radius = max(4, min(12, radius))

        points.append({
            "x": round(col / width, 4),
            "y": round(row / height, 4),
            "r": radius,
            "score": round(score, 4),
        })

        r0 = max(row - min_distance, 0)
        r1 = min(row + min_distance + 1, height)
        c0 = max(col - min_distance, 0)
        c1 = min(col + min_distance + 1, width)
        working[r0:r1, c0:c1] = 0.0

    img_width, img_height = image_size
    return {
        "type": "circles",
        "threshold": round(threshold, 4),
        "points": points,
        "image_size": {"width": img_width, "height": img_height},
    }


def _generate_heatmap_overlay(cam_map: np.ndarray) -> str:
    alpha = np.clip(np.power(cam_map, 1.6) * 180, 0, 180).astype(np.uint8)
    height, width = cam_map.shape
    overlay = np.zeros((height, width, 4), dtype=np.uint8)
    overlay[..., 0] = 220
    overlay[..., 1] = 38
    overlay[..., 2] = 38
    overlay[..., 3] = alpha

    overlay_img = Image.fromarray(overlay, mode="RGBA")
    buffer = io.BytesIO()
    overlay_img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def predict_xray(image) -> dict:
    if isinstance(image, Image.Image):
        pil_image = image.convert("RGB")
    elif isinstance(image, (bytes, bytearray)):
        pil_image = Image.open(io.BytesIO(image)).convert("RGB")
    else:
        raise ValueError("Unsupported image input format.")

    input_resnet = transform_resnet(pil_image).unsqueeze(0).to(DEVICE)
    input_vit = transform_vit(pil_image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = ensemble_model(input_resnet, input_vit)
        probabilities = torch.softmax(outputs, dim=1)[0].cpu().numpy()

    predictions = {
        class_name: float(prob)
        for class_name, prob in zip(CLASS_NAMES, probabilities)
    }

    top_class = max(predictions, key=predictions.get)
    confidence = predictions[top_class]

    cam_map = _generate_gradcam_map(pil_image)
    heatmap_regions = _extract_points(cam_map, pil_image.size)
    heatmap_overlay = _generate_heatmap_overlay(cam_map)

    return {
        "class": top_class,
        "confidence": confidence,
        "probabilities": predictions,
        "heatmap_regions": heatmap_regions,
        "heatmap_overlay": heatmap_overlay,
    }
