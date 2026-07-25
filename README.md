# Factory Video Analysis — MOST Study Automation

Automated time-and-motion study from factory floor video. Upload a work-cycle video → face-blur → CV tracking → Gemini segmentation → MOST classification → Excel report.

## Local Development

### Prerequisites
- Python 3.11+
- Node 22+
- A Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)

### Setup

```bash
# 1. Backend
cd backend
cp .env.example .env          # fill in GEMINI_API_KEY
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8123

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev                   # opens http://localhost:5173
```

The Vite dev server proxies `/api` to `127.0.0.1:8123` automatically.

---

## Deploy to Railway

### One-time setup

1. Push this repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**.
3. Select this repository. Railway auto-detects the `Dockerfile`.
4. In **Settings → Variables**, add:
   ```
   GEMINI_API_KEY = your-api-key
   GEMINI_MODEL   = gemini-2.0-flash
   ```
5. Click **Deploy**. Build takes ~5–8 min (torch download).
6. Railway gives you a URL like `https://factory-analysis-xxx.railway.app`.

### After deploy

| URL | Purpose |
|---|---|
| `https://your-app.railway.app/` | Main UI |
| `https://your-app.railway.app/health` | Health check |
| `https://your-app.railway.app/docs` | Swagger API docs |

### Persistent volume (recommended)

By default, uploaded videos and Excel outputs are stored inside the container and lost on restart. To persist them:

1. Railway dashboard → your service → **Volumes** → **Add Volume**.
2. Mount path: `/app/../data/uploads` → effectively `/data/uploads`.
3. Re-deploy.

---

## Architecture

```
Dockerfile (single service)
  ├── Stage 1: node:22-slim   → npm run build → frontend/dist/
  └── Stage 2: python:3.11-slim
        ├── pip install requirements.txt  (CPU torch, mediapipe, ultralytics)
        ├── COPY data/ (templates, models)
        ├── COPY frontend/dist/  ← built in Stage 1
        └── uvicorn app.main:app --host 0.0.0.0 --port $PORT
              ├── /api/v1/*        ← FastAPI routes
              ├── /health          ← Railway healthcheck
              ├── /docs            ← Swagger
              └── /*               ← React SPA (StaticFiles)
```

## Pipeline Stages

| Stage | What it does |
|---|---|
| 2 | Face-blur pass (MediaPipe + Haar cascade) |
| 3 | CV hand tracking (MediaPipe HandLandmarker + YOLO-World) |
| 4 | VLM segmentation (Gemini — anchored to Stage 3 timing) |
| 5 | Structured MOST classification (Gemini JSON schema) |
| 6 | Deterministic TMU engine |
| 7 | Excel report (openpyxl, copies real template) |
| 8 | Human review gate |
