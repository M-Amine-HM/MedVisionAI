from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from io import BytesIO
from inference import predict_xray

app = FastAPI(title="Chest X-Ray Disease Classification")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}

CLASS_META = {
    "Normal": {
        "color": "#16A34A",
        "message": "No disease detected. Lung structure appears normal.",
    },
    "Pneumonia": {
        "color": "#D97706",
        "message": "Signs of Pneumonia detected. Medical consultation recommended.",
    },
    "COVID-19": {
        "color": "#DC2626",
        "message": "Signs of COVID-19 detected. Immediate medical attention advised.",
    },
    "Tuberculosis": {
        "color": "#7C3AED",
        "message": "Signs of Tuberculosis detected. Specialist consultation required.",
    },
}


@app.on_event("startup")
def on_startup() -> None:
    app.state.model_loaded = True


def normalize_class_name(name: str) -> str:
    if not name:
        return ""
    cleaned = name.strip()
    upper = cleaned.upper().replace(" ", "").replace("_", "")
    if upper in {"COVID19", "COVID-19"}:
        return "COVID-19"
    lower = cleaned.lower()
    if lower == "normal":
        return "Normal"
    if lower == "pneumonia":
        return "Pneumonia"
    if lower in {"tuberculosis", "tb"}:
        return "Tuberculosis"
    return cleaned


def normalize_probabilities(probabilities) -> dict:
    if not isinstance(probabilities, dict):
        return {}
    normalized = {}
    for key, value in probabilities.items():
        class_name = normalize_class_name(str(key))
        if not class_name:
            continue
        normalized_key = "COVID19" if class_name == "COVID-19" else class_name
        try:
            normalized[normalized_key] = float(value)
        except (TypeError, ValueError):
            normalized[normalized_key] = 0.0

    for key in ["Normal", "Pneumonia", "COVID19", "Tuberculosis"]:
        normalized.setdefault(key, 0.0)

    return normalized


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a JPG or PNG image.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Please upload an image under 10MB.",
        )

    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except (UnidentifiedImageError, ValueError):
        raise HTTPException(
            status_code=422,
            detail="Corrupted or unreadable image.",
        )
    except Exception:
        raise HTTPException(
            status_code=422, detail="Corrupted or unreadable image.")

    try:
        prediction = predict_xray(image)
    except Exception:
        raise HTTPException(status_code=500, detail="Model inference failed.")

    class_name = None
    confidence = None
    probabilities = None

    heatmap = None

    if isinstance(prediction, dict):
        class_name = prediction.get(
            "class") or prediction.get("predicted_class")
        confidence = prediction.get("confidence")
        probabilities = prediction.get("probabilities", {})
        heatmap = prediction.get("heatmap")
    elif isinstance(prediction, (list, tuple)) and len(prediction) >= 3:
        class_name, confidence, probabilities = prediction[0], prediction[1], prediction[2]
    else:
        raise HTTPException(
            status_code=500, detail="Unexpected model response format.")

    if class_name is None:
        raise HTTPException(
            status_code=500, detail="Unexpected model response format.")

    class_name = normalize_class_name(str(class_name))
    if not class_name:
        raise HTTPException(
            status_code=500, detail="Unexpected model response format.")
    class_key = "COVID19" if class_name == "COVID-19" else class_name
    prob_map = normalize_probabilities(probabilities)

    try:
        confidence_value = float(confidence)
    except (TypeError, ValueError):
        confidence_value = float(prob_map.get(class_key, 0.0))

    if class_key in prob_map:
        prob_map[class_key] = max(prob_map[class_key], confidence_value)

    meta = CLASS_META.get(class_name)
    if not meta:
        meta = {
            "color": "#2563EB",
            "message": "Prediction completed. Consult a medical professional for diagnosis.",
        }

    return {
        "predicted_class": class_name,
        "confidence": round(confidence_value, 4),
        "probabilities": prob_map,
        "color": meta["color"],
        "message": meta["message"],
        "heatmap": heatmap,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": "loaded"}
