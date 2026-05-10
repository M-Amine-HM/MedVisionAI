from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Dict

import torch
import torch.nn as nn
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
    return ensemble


ensemble_model = _load_models()


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

    return {
        "class": top_class,
        "confidence": confidence,
        "probabilities": predictions,
    }
