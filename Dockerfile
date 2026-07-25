# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:22-slim AS frontend-build

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline

COPY frontend/ ./
RUN npm run build
# Output: /build/frontend/dist/


# ── Stage 2: Python runtime ────────────────────────────────────────────────────
FROM python:3.11-slim

# System dependencies required by OpenCV (headless) and MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer cached until requirements change)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full backend source
COPY backend/ .

# Copy data directory (templates, models, uploads placeholder)
COPY data/ ../data/

# Copy built React app into frontend/dist/ where main.py expects it
COPY --from=frontend-build /build/frontend/dist/ ../frontend/dist/

# Copy YOLO weights into the location stage3_cv_tracking.py expects
# (OBJECT_DETECTION_MODEL = "yolov8s-world.pt" — relative, loaded by ultralytics
#  from wherever the process working directory is, which is /app)
COPY backend/yolov8s-world.pt ./yolov8s-world.pt

# Create uploads directory (persisted via Railway volume in production)
RUN mkdir -p ../data/uploads

# Railway injects $PORT at runtime. Default to 8000 for local docker run.
ENV PORT=8000

# Pre-download MediaPipe model files at build time so first request isn't slow.
# Falls back gracefully if network is unavailable during build.
RUN python -c "
from app.pipeline.stage3_cv_tracking import ensure_models_downloaded
try:
    ensure_models_downloaded()
    print('MediaPipe models downloaded.')
except Exception as e:
    print(f'MediaPipe model download skipped: {e}')
" || true

# Expose the port (documentation only; Railway uses $PORT)
EXPOSE $PORT

# Start command: reads $PORT from Railway's environment
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
