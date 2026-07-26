import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.pipeline.stage3_cv_tracking import ensure_models_downloaded

try:
    ensure_models_downloaded()
    print("MediaPipe models downloaded.")
except Exception as e:
    print(f"MediaPipe model download skipped: {e}")

try:
    from ultralytics import YOLO
    _ = YOLO("yolov8s-world.pt")
    print("YOLO-World weights pre-downloaded.")
except Exception as e:
    print(f"YOLO model download skipped: {e}")
