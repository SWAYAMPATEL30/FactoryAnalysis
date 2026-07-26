"""Pre-download MediaPipe model files at Docker build time.

YOLO-World (yolov8s-world.pt) is downloaded separately in the Dockerfile
via a direct curl RUN step — that guarantees it is on disk before this
script runs and before the container starts.
"""
try:
    from app.pipeline.stage3_cv_tracking import ensure_models_downloaded
    ensure_models_downloaded()
    print("✅ MediaPipe models downloaded.")
except Exception as e:
    print(f"⚠️  MediaPipe model download skipped: {e}")
