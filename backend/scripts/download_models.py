"""Pre-download ALL model files at Docker build time so nothing is fetched at runtime.

Called by the Dockerfile RUN step. Bakes all weights into the image so the
container never downloads anything at startup (prevents OOM kills on Railway).
"""
import sys
import os

# ── 0. Ensure open_clip is aliased as 'clip' for YOLO-World compatibility ──────
try:
    import clip  # noqa: F401
except ImportError:
    try:
        import open_clip
        sys.modules["clip"] = open_clip
        print("open_clip aliased as clip for YOLO-World.")
# ── 1. YOLOv8 Nano weights (6.2MB) ──────────────────────────────────────────────
try:
    from ultralytics import YOLO
    model = YOLO("yolov8n.pt")
    
    size_mb = os.path.getsize("yolov8n.pt") // (1024 * 1024)
    print(f"YOLOv8 Nano weights ready: {size_mb}MB at yolov8n.pt")
except Exception as e:
    print(f"YOLOv8 Nano pre-warm failed: {e}")
    raise  # fail the build loudly so Railway doesn't silently skip this

# ── 2. MediaPipe hand + pose models ───────────────────────────────────────────
try:
    from app.pipeline.stage3_cv_tracking import ensure_models_downloaded
    ensure_models_downloaded()
    print("MediaPipe models downloaded.")
except Exception as e:
    print(f"MediaPipe model download skipped: {e}")
