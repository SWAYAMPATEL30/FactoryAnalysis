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

# Set PYTHONPATH so 'from app.pipeline...' works at build time
ENV PYTHONPATH=/app

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

# ── Cache-bust: increment this value to force a full re-download every build ──
ARG CACHEBUST=3

# ── Download YOLO-World weights at BUILD time via ultralytics Python API ───────
# ultralytics knows the correct CDN URL and handles all redirects automatically.
# We alias open_clip -> clip first so YOLO-World initialises without openai-clip.
RUN python -c "\
import sys; \
try: \
    import clip; \
except ImportError: \
    try: \
        import open_clip; \
        sys.modules['clip'] = open_clip; \
    except Exception: \
        pass; \
from ultralytics import YOLO; \
model = YOLO('yolov8s-world.pt'); \
import os; \
size = os.path.getsize('yolov8s-world.pt') // (1024*1024); \
print(f'YOLO-World weights ready: {size}MB at yolov8s-world.pt'); \
"

# ── Pre-download MediaPipe models at BUILD time ────────────────────────────────
RUN python scripts/download_models.py

# Railway injects $PORT at runtime. Default to 8000 for local docker run.
ENV PORT=8000

# Expose port (documentation only; Railway uses $PORT env var)
EXPOSE $PORT

# Start command: reads $PORT from Railway's environment
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1"]
