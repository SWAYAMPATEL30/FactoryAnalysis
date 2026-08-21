import shutil
import logging
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger(__name__)

def enforce_storage_limits(upload_dir: Path, max_analyses: int = 100) -> None:
    """
    Enforce a storage limit of max_analyses by scanning the filesystem for analysis_* folders,
    sorting them, keeping the newest max_analyses (default 100), and removing oldest if limit exceeded.
    """
    logger.info("Starting storage cleanup...")
    print("Starting storage cleanup...")
    if not upload_dir.exists():
        return

    # Find all analysis folders
    analysis_folders = [p for p in upload_dir.iterdir() if p.is_dir() and p.name.startswith("analysis_")]
    
    # Sort folders by creation time (st_ctime) descending, so newest are first
    try:
        analysis_folders.sort(key=lambda x: x.stat().st_ctime, reverse=True)
    except Exception as e:
        logger.warning(f"Failed to sort analysis folders by creation time: {e}")
        # Fallback to sorting by name (if they contain timestamps in the name)
        analysis_folders.sort(key=lambda x: x.name, reverse=True)

    # If we have more than max_analyses, delete the oldest
    if len(analysis_folders) > max_analyses:
        folders_to_delete = analysis_folders[max_analyses:]
        for folder in folders_to_delete:
            try:
                shutil.rmtree(folder, ignore_errors=True)
                logger.info(f"Deleted old analysis: {folder.name}")
                print(f"Deleted old analysis: {folder.name}")
            except Exception as e:
                logger.warning(f"Warning: Failed to delete orphaned folder {folder}: {e}")
                print(f"Warning: Failed to delete orphaned folder {folder}: {e}")
                
        # Log space after cleanup
        try:
            _, _, free = shutil.disk_usage(str(upload_dir))
            logger.info(f"Disk usage after cleanup: {free / (1024**3):.2f} GB free")
            print(f"Disk usage after cleanup: {free / (1024**3):.2f} GB free")
        except Exception:
            pass
            
    logger.info("Storage cleanup completed.")
    print("Storage cleanup completed.")


def verify_disk_space(upload_dir: Path, required_bytes: int) -> bool:
    """
    Verify that the disk containing `upload_dir` has enough free space.
    Returns True if enough space, False otherwise.
    """
    if not upload_dir.exists():
        try:
            upload_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            # If we can't create it, we can't write to it. Let it fail normally during write.
            return True 
            
    try:
        total, used, free = shutil.disk_usage(str(upload_dir))
        logger.info(f"Free disk space before upload: {free / (1024**3):.2f} GB")
        print(f"Free disk space before upload: {free / (1024**3):.2f} GB")
        # Enforce a strict minimum of the requested bytes + 250 MB safety buffer
        safety_buffer = 250 * 1024 * 1024 # 250 MB
        return free >= (required_bytes + safety_buffer)
    except Exception as e:
        logger.warning(f"Failed to check disk space: {e}")
        return True
