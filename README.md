# ChestAI · Chest X-Ray Disease Classification

> ⚠️ For research and educational purposes only. This tool is not a substitute for professional medical diagnosis.

![Screenshot Placeholder](docs/screenshot-placeholder.svg)

## Overview
ChestAI is a clinical-grade web application that wraps a deep learning ensemble model to classify chest X-ray images into four respiratory conditions. Users upload a JPG/PNG image, the FastAPI backend runs inference, and the React frontend presents a clear, trustworthy medical UI with confidence breakdowns.

## Tech Stack
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-FF6F00?logo=tensorflow&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?logo=tailwindcss&logoColor=white)

## Detectable Classes
- **Normal** — Healthy lung structure with no signs of disease.
- **Pneumonia** — Bacterial or viral lung infection causing inflammation.
- **COVID-19** — Viral infection causing ground-glass opacity patterns.
- **Tuberculosis** — Bacterial infection with upper lobe infiltrates.

## How to Run (Backend)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## How to Run (Frontend)
```bash
cd frontend
npm install
npm run dev
```

## Notes
- The backend expects a multipart form upload with field name `file`.
- Supported formats: JPG, JPEG, PNG (max 10MB).

---
**For research purposes only.**
