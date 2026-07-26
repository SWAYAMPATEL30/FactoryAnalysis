# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:22-slim AS frontend-build

WORKDIR /build/frontend
COPY frontend/package.json ./
COPY frontend/ ./
RUN npm install
RUN npm run build


# ── Stage 2: Python runtime ────────────────────────────────────────────────────
FROM python:3.11-slim

# System dependencies required by OpenCV (headless) and MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (layer cached until requirements.txt changes)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full backend source
COPY backend/ .

# Copy data directory (templates, models, uploads placeholder)
COPY data/ ../data/

# Copy built React app into frontend/dist/ where main.py expects it
COPY --from=frontend-build /build/frontend/dist/ ../frontend/dist/

# YOLO weights — copied into /app so ultralytics finds them relative to CWD
COPY backend/yolov8s-world.pt ./yolov8s-world.pt

# Create uploads directory
RUN mkdir -p ../data/uploads

# Railway injects $PORT at runtime. Default to 8000 for local docker run.
ENV PORT=8000

# Pre-download MediaPipe model files at build time using a script
# (avoids multi-line python -c strings that confuse the Dockerfile parser)
RUN python scripts/download_models.py || true

# Expose port (documentation only; Railway uses $PORT env var)
EXPOSE $PORT

# Start command: reads $PORT from Railway's environment
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1"]
