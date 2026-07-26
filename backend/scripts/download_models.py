"""Pre-download ALL model files at Docker build time so nothing is fetched at runtime.

This script is called from the Dockerfile RUN step. Running it at build time means:
  - MediaPipe hand/pose weights are on disk before the container starts.
  - yolov8s-world.pt (338MB) is downloaded directly to /app so ultralytics finds it
    by relative path at runtime without any network call.
Both prevent runtime OOM kills on Railway's memory-constrained containers.
"""
import sys
import urllib.request
from pathlib import Path

# ── 1. MediaPipe models ────────────────────────────────────────────────────────
try:
    from app.pipeline.stage3_cv_tracking import ensure_models_downloaded
    ensure_models_downloaded()
    print("✅ MediaPipe models downloaded.")
except Exception as e:
    print(f"⚠️  MediaPipe model download skipped: {e}")

# ── 2. YOLO-World weights — explicit direct download ──────────────────────────
# Do NOT rely on ultralytics auto-download at runtime (it spikes 338MB RAM
# inside the container and causes OOM kills). Instead download the .pt file
# directly via urllib at Docker build time, exactly like MediaPipe above.
YOLO_DEST = Path("/app/yolov8s-world.pt")
YOLO_URL = (
    "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8s-world.pt"
)

if YOLO_DEST.exists():
    print(f"✅ YOLO-World weights already present at {YOLO_DEST} ({YOLO_DEST.stat().st_size // 1024 // 1024}MB).")
else:
    print(f"⬇️  Downloading YOLO-World weights to {YOLO_DEST} ...")
    try:
        urllib.request.urlretrieve(YOLO_URL, YOLO_DEST)
        print(f"✅ YOLO-World weights downloaded ({YOLO_DEST.stat().st_size // 1024 // 1024}MB).")
    except Exception as e:
        print(f"⚠️  YOLO-World download failed: {e}")
