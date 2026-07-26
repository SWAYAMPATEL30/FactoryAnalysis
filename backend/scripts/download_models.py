"""Pre-download ALL model files at Docker build time so nothing is fetched at runtime.

This script is called from the Dockerfile RUN step. Running it at build time means:
  - MediaPipe hand/pose weights are on disk before the container starts.
  - YOLO-World (yolov8s-world.pt) is pre-warmed and its internal cache is populated.
Both prevent runtime OOM kills from large model downloads inside a memory-constrained container.
"""
import sys

# ── 1. MediaPipe models ────────────────────────────────────────────────────────
try:
    from app.pipeline.stage3_cv_tracking import ensure_models_downloaded
    ensure_models_downloaded()
    print("✅ MediaPipe models downloaded.")
except Exception as e:
    print(f"⚠️  MediaPipe model download skipped: {e}")

# ── 2. YOLO-World weights pre-warm ────────────────────────────────────────────
# Importing YOLO and loading the weights here causes ultralytics to cache the
# model internals so the first real inference in the container is instant.
try:
    # Ensure the open_clip alias is available if openai-clip is not installed
    try:
        import clip  # noqa: F401
    except ImportError:
        try:
            import open_clip
            sys.modules["clip"] = open_clip
        except ImportError:
            pass

    from ultralytics import YOLO
    from app.pipeline.stage3_cv_tracking import OBJECT_DETECTION_MODEL
    from app.config.cv_vocabulary import load_cv_vocabulary

    model = YOLO(OBJECT_DETECTION_MODEL)
    vocab = load_cv_vocabulary()
    model.set_classes(vocab.object_queries)
    print(f"✅ YOLO-World model pre-warmed with {len(vocab.object_queries)} object classes.")
except Exception as e:
    print(f"⚠️  YOLO-World pre-warm skipped: {e}")

