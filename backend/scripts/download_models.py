"""Pre-download MediaPipe model files at Docker build time."""
from app.pipeline.stage3_cv_tracking import ensure_models_downloaded
try:
    ensure_models_downloaded()
    print("MediaPipe models downloaded.")
except Exception as e:
    print(f"MediaPipe model download skipped: {e}")
