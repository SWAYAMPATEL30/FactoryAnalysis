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
    except Exception as e:
        print(f"clip/open_clip alias skipped: {e}")

# ── 1. YOLO-World weights & CLIP text encoder (338MB) ───────────────────────
try:
    from ultralytics import YOLO
    from app.config.cv_vocabulary import load_cv_vocabulary
    model = YOLO("yolov8s-world.pt")
    
    # CRITICAL: We must call set_classes() at build time. 
    # YOLO-World downloads the 338MB CLIP text encoder weights (ViT-B/32) 
    # the first time set_classes() is called. If we don't do this here, 
    # it downloads at runtime and causes the OOM kill.
    vocab = load_cv_vocabulary()
    model.set_classes(vocab.object_queries)
    
    size_mb = os.path.getsize("yolov8s-world.pt") // (1024 * 1024)
    print(f"YOLO-World weights ready: {size_mb}MB at yolov8s-world.pt")
    print("CLIP text encoder weights pre-warmed successfully.")
except Exception as e:
    print(f"YOLO-World pre-warm failed: {e}")
    raise  # fail the build loudly so Railway doesn't silently skip this

# ── 2. MediaPipe hand + pose models ───────────────────────────────────────────
try:
    from app.pipeline.stage3_cv_tracking import ensure_models_downloaded
    ensure_models_downloaded()
    print("MediaPipe models downloaded.")
except Exception as e:
    print(f"MediaPipe model download skipped: {e}")
