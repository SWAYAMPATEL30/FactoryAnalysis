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
    curl \
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

# Create uploads directory
RUN mkdir -p ../data/uploads

# ── Download YOLO-World weights at BUILD time (338MB) ─────────────────────────
# Using curl directly in the Dockerfile (not a Python script) so Docker creates
# a fresh uncached layer and the file is guaranteed on disk before the container
# starts. ultralytics looks for "yolov8s-world.pt" relative to CWD (/app).
RUN curl -L -o /app/yolov8s-world.pt \
    "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8s-world.pt" \
    && echo "YOLO-World weights downloaded: $(du -sh /app/yolov8s-world.pt | cut -f1)"

# ── Pre-download MediaPipe models at BUILD time ────────────────────────────────
RUN python scripts/download_models.py

# Railway injects $PORT at runtime. Default to 8000 for local docker run.
ENV PORT=8000

# Expose port (documentation only; Railway uses $PORT env var)
EXPOSE $PORT

# Start command: reads $PORT from Railway's environment
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1"]
