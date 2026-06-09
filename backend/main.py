from contextlib import asynccontextmanager
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from io import BytesIO
from inference import predict_xray
from rag import generate_medical_report, vector_store
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    yield
    # shutdown (add cleanup here if needed)


app = FastAPI(title="Chest X-Ray Disease Classification", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png"}

# Keys match CLASS_NAMES in inference.py exactly
CLASS_META = {
    "Normal": {
        "color": "#16A34A",
        "message": "No disease detected. Lung structure appears normal.",
    },
    "Pneumonia": {
        "color": "#D97706",
        "message": "Signs of Pneumonia detected. Medical consultation recommended.",
    },
    "COVID19": {
        "color": "#DC2626",
        "message": "Signs of COVID-19 detected. Immediate medical attention advised.",
    },
    "Tuberculosis": {
        "color": "#7C3AED",
        "message": "Signs of Tuberculosis detected. Specialist consultation required.",
    },
}

# Display names for the frontend
DISPLAY_NAMES = {
    "COVID19": "COVID-19",
    "Normal": "Normal",
    "Pneumonia": "Pneumonia",
    "Tuberculosis": "Tuberculosis",
}


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict:
    # ── Validate file type ────────────────────────────────────────────────────
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a JPG or PNG image.",
        )

    # ── Read & size-check ─────────────────────────────────────────────────────
    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Please upload an image under 10MB.",
        )

    # ── Decode image ──────────────────────────────────────────────────────────
    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except (UnidentifiedImageError, ValueError):
        raise HTTPException(
            status_code=422, detail="Corrupted or unreadable image.")
    except Exception:
        raise HTTPException(
            status_code=422, detail="Corrupted or unreadable image.")

    # ── Run inference ─────────────────────────────────────────────────────────
    try:
        result = predict_xray(image)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Model inference failed: {str(e)}")

    # ── Extract results ───────────────────────────────────────────────────────
    top_class = result["class"]
    confidence = float(result["confidence"])
    probabilities = result["probabilities"]
    heatmap_regions = result.get("heatmap_regions")
    heatmap_overlay = result.get("heatmap_overlay")

    # ── Generate RAG Report ───────────────────────────────────────────────────
    try:
        report = generate_medical_report(
            predicted_class=top_class,
            confidence=confidence,
            probabilities=probabilities,
            vector_store=vector_store
        )
    except Exception as e:
        # Don't fail the whole request if RAG fails, just return the prediction
        report = f"Report generation failed: {str(e)}"

    meta = CLASS_META.get(top_class, {
        "color": "#2563EB",
        "message": "Prediction completed. Consult a medical professional for diagnosis.",
    })

    return {
        "predicted_class": DISPLAY_NAMES.get(top_class, top_class),
        "confidence": round(confidence, 4),
        "probabilities": {
            DISPLAY_NAMES.get(k, k): round(v, 4)
            for k, v in probabilities.items()
        },
        "color": meta["color"],
        "message": meta["message"],
        "heatmap_regions": heatmap_regions,
        "heatmap_overlay": heatmap_overlay,
        "rag_report": report,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": "loaded"}
