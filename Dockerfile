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

# Force all caches (like HuggingFace/CLIP weights) to stay inside /app
ENV XDG_CACHE_HOME=/app/.cache
ENV XDG_CONFIG_HOME=/app/.config
ENV TORCH_HOME=/app/.cache/torch

# Install Python dependencies (layer cached until requirements.txt changes)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full backend source
COPY backend/ .

# Copy data directory (templates, models, uploads placeholder)
COPY data/ ../data/

# Copy built React app into frontend/dist/ where main.py expects it
COPY --from=frontend-build /build/frontend/dist/ ../frontend/dist/

# ── EXTREME MEMORY OPTIMIZATION FOR RAILWAY FREE TIER (500MB RAM) ─────────────
# MALLOC_ARENA_MAX=2 prevents glibc memory fragmentation (saves ~100MB+ RAM)
ENV MALLOC_ARENA_MAX=2
# Restrict all underlying C/C++ libraries to 1 thread to avoid thread-pool memory overhead
ENV OMP_NUM_THREADS=1
ENV OPENBLAS_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV VECLIB_MAXIMUM_THREADS=1
ENV NUMEXPR_NUM_THREADS=1
# ──────────────────────────────────────────────────────────────────────────────

# Create uploads directory
RUN mkdir -p ../data/uploads

# ── Cache-bust: increment to force a full re-download on every build ───────────
ARG CACHEBUST=10

# ── Pre-download ALL model weights at build time ───────────────────────────────
# download_models.py downloads YOLO-World (338MB) + MediaPipe models and bakes
# them into the image so the container never fetches anything at runtime.
RUN python scripts/download_models.py

# Railway injects $PORT at runtime. Default to 8000 for local docker run.
ENV PORT=8000

# Expose port (documentation only; Railway uses $PORT env var)
EXPOSE $PORT

# Start command: reads $PORT from Railway's environment
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1"]
