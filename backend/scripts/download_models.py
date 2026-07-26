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
    from app.config.cv_vocabulary import load_cv_vocabulary
    model = YOLO("yolov8s-world.pt")
    queries = load_cv_vocabulary().object_queries
    model.set_classes(queries)
    print(f"YOLO-World weights and CLIP text model pre-downloaded for {len(queries)} vocabulary queries.")
except Exception as e:
    print(f"YOLO model download skipped: {e}")
