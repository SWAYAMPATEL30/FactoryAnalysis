"""FastAPI REST Service Layer (Roadmap Item 3).

Exposes full REST API for video upload, automated MOST pipeline analysis execution,
job status tracking, human review flag clearance, and Excel report downloading.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import time
import uuid
from pathlib import Path
from typing import Dict, Any, List

from fastapi import FastAPI, BackgroundTasks, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.models.schemas import Classification, MostRow, ReviewFlag, Segment
from app.pipeline.stage8_human_review import HumanReviewEngine
from app.pipeline.stage7_excel_writer import write_most_analysis_workbook
from app.pipeline.stage2_preprocessing import blur_faces
from app.pipeline.stage3_cv_tracking import CVTracker
from app.pipeline.stage4_segmentation import segment_video
from app.pipeline.stage5_classification import classify_segments
from app.pipeline.stage6_tmu_engine import build_most_row
from app.services.gemini_client import GeminiClient

app = FastAPI(
    title="MOST Factory Video Analysis API",
    description="Automated time-and-motion study API using computer vision and Gemini VLM.",
    version="1.0.0",
)

# CORS — allow all origins so the React frontend can call the API
# regardless of whether it is served from the same domain or a CDN.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["ops"])
def health_check():
    """Railway / load-balancer health probe. Returns 200 when the service is up."""
    return {"status": "ok"}

ROOT_DIR = Path(__file__).parent.parent.parent
UPLOAD_DIR = ROOT_DIR / "data" / "uploads"
TEMPLATE_PATH = ROOT_DIR / "data" / "templates" / "most_analysis_template.xlsx"
SAMPLE_VIDEO_PATH = ROOT_DIR / "data" / "samples" / "assy_with_press_operation.mp4"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 512 MB upload cap — prevents OOM on large files.
_MAX_UPLOAD_BYTES = 512 * 1024 * 1024

MANUAL_SEC_PER_MOTION = 180

# In-memory job store for Phase 0/1 (pluggable to DB in cloud deployment)
JOBS: Dict[str, Dict[str, Any]] = {}

# Per-job event log for SSE streaming (list of dicts with stage/status/detail/progress)
JOB_EVENTS: Dict[str, List[dict]] = {}


def _emit(job_id: str, stage: str, status: str, detail: str = "", progress: float | None = None) -> None:
    """Append a progress event to JOB_EVENTS for SSE streaming."""
    event = {
        "stage": stage,
        "status": status,  # pending | running | done | error
        "detail": detail,
        "progress": progress,
        "ts": time.time(),
    }
    JOB_EVENTS.setdefault(job_id, []).append(event)
    JOBS.setdefault(job_id, {})["last_event"] = event


class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # "QUEUED", "PROCESSING", "COMPLETED", "FAILED"
    phase: str = "QUEUED"
    row_count: int = 0
    flag_count: int = 0
    error: str | None = None
    elapsed_sec: float | None = None
    estimated_manual_sec: int | None = None


class ReviewSubmission(BaseModel):
    segment_id: int
    data_card: str
    param_values: list[int]
    muda_ref: int
    activity_description: str = ""
    freq: int = 1


def _create_job(
    background_tasks: BackgroundTasks,
    job_id: str,
    raw_video_path: Path,
    activity_description: str,
    station_no: str,
    activity_no: str,
    fast_mode: bool = False,
) -> str:
    output_excel_path = UPLOAD_DIR / f"{job_id}_most_analysis.xlsx"

    JOBS[job_id] = {
        "status": "QUEUED",
        "phase": "QUEUED",
        "raw_video_path": raw_video_path,
        "output_excel_path": output_excel_path,
        "activity_description": activity_description,
        "station_no": station_no,
        "activity_no": activity_no,
        "fast_mode": fast_mode,
    }

    background_tasks.add_task(
        _process_video_job,
        job_id,
        raw_video_path,
        output_excel_path,
        activity_description,
        station_no,
        activity_no,
        fast_mode,
    )
    return job_id


def _process_video_job(
    job_id: str,
    raw_video_path: Path,
    output_excel_path: Path,
    activity_desc: str,
    station_no: str = "",
    activity_no: str = "",
    fast_mode: bool = False,
) -> None:
    try:
        JOBS[job_id]["status"] = "PROCESSING"
        JOBS[job_id]["started_at"] = time.monotonic()

        # Stage 2: Face blur
        JOBS[job_id]["phase"] = "PREPROCESSING"
        _emit(job_id, "PREPROCESSING", "running", "Detecting and blurring faces…", 0.0)
        blurred_path = UPLOAD_DIR / f"_blurred_{raw_video_path.name}"
        blur_faces(raw_video_path, blurred_path)
        _emit(job_id, "PREPROCESSING", "done", "Face blur complete", 1.0)

        # Stage 3: CV tracking
        mode_label = "fast (640p, 2fps, skip frames)" if fast_mode else "accurate (full res, 4fps)"
        _emit(job_id, "CV_TRACKING", "running", f"Running CV hand tracking [{mode_label}]…", 0.0)
        JOBS[job_id]["phase"] = "PREPROCESSING"
        try:
            fps = 2.0 if fast_mode else 4.0
            tracker = CVTracker(sample_fps=fps, fast_mode=fast_mode)
            motion_events = tracker.build_motion_event_stream(blurred_path)
            _emit(job_id, "CV_TRACKING", "done", f"Found {len(motion_events)} motion events", 1.0)
        except Exception as cv_err:
            motion_events = None
            _emit(job_id, "CV_TRACKING", "done", f"CV tracking skipped: {cv_err}", 1.0)

        # Stage 4: Upload video to Gemini
        JOBS[job_id]["phase"] = "UPLOADING"
        _emit(job_id, "UPLOADING", "running", "Uploading blurred video to Gemini…", 0.0)
        client = GeminiClient()
        uploaded_video = client.upload_video(blurred_path)
        _emit(job_id, "UPLOADING", "done", "Video ready for VLM analysis", 1.0)

        # Stage 5: VLM Segmentation
        JOBS[job_id]["phase"] = "SEGMENTING"
        _emit(job_id, "SEGMENTING", "running", "Gemini identifying elemental motion boundaries…", 0.0)
        segments = segment_video(client, uploaded_video, str(raw_video_path), motion_events=motion_events)
        _emit(job_id, "SEGMENTING", "done", f"Found {len(segments)} motion segments", 1.0)

        # Stage 6: Structured Classification
        JOBS[job_id]["phase"] = "CLASSIFYING"
        _emit(job_id, "CLASSIFYING", "running", f"Classifying {len(segments)} segments against MOST data cards…", 0.0)
        classifications, review_flags = classify_segments(client, segments)
        _emit(job_id, "CLASSIFYING", "done",
              f"{len(classifications)} classified, {len(review_flags)} flagged for review", 1.0)

        # Stage 7: TMU Engine + Excel
        JOBS[job_id]["phase"] = "FINALIZING"
        _emit(job_id, "FINALIZING", "running", "Computing TMU values and building Excel report…", 0.0)
        rows: list[MostRow] = []
        for i, seg in enumerate(segments):
            cls = classifications.get(seg.segment_id)
            if cls is not None:
                r = build_most_row(seg, cls, s_no=i + 1, activity_description=activity_desc)
                if station_no:
                    r.station_no = station_no
                if activity_no:
                    r.activity_no = activity_no
                rows.append(r)

        write_most_analysis_workbook(rows, TEMPLATE_PATH, output_excel_path, activity_desc)
        _emit(job_id, "FINALIZING", "done", f"{len(rows)} rows written to workbook", 1.0)

        # Store results
        engine = HumanReviewEngine(rows, segments, review_flags)
        JOBS[job_id]["status"] = "COMPLETED"
        JOBS[job_id]["phase"] = "COMPLETED"
        JOBS[job_id]["completed_at"] = time.monotonic()
        JOBS[job_id]["rows"] = rows
        JOBS[job_id]["segments"] = segments
        JOBS[job_id]["flags"] = review_flags
        JOBS[job_id]["review_engine"] = engine
        JOBS[job_id]["excel_path"] = output_excel_path
        _emit(job_id, "COMPLETED", "done", f"Analysis complete — {len(rows)} motions classified", 1.0)
    except Exception as e:
        JOBS[job_id]["status"] = "FAILED"
        JOBS[job_id]["phase"] = "FAILED"
        JOBS[job_id]["error"] = str(e)
        _emit(job_id, "FAILED", "error", str(e))


@app.post("/api/v1/analyze", response_model=JobStatusResponse)
async def analyze_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    activity_description: str = Form("ASSY WITH PRESS OPERATION"),
    station_no: str = Form(""),
    activity_no: str = Form(""),
    fast_mode: bool = Form(False),
    use_cv_tracking: str = Form(None),
):
    """Upload a factory floor video clip to launch automated MOST study analysis.
    
    If fast_mode=True, Stage 3 CV tracking uses aggressive optimizations (downscaling,
    frame skipping, 2fps) to finish in ~30s instead of ~7 mins.
    """
    # Backwards compatibility for cached frontends
    if use_cv_tracking == "false":
        fast_mode = True
        
    job_id = str(uuid.uuid4())
    raw_video_path = UPLOAD_DIR / f"{job_id}_{file.filename}"

    # Stream to disk in chunks to avoid reading the whole file into memory.
    total = 0
    with open(raw_video_path, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)  # 1 MB chunks
            if not chunk:
                break
            total += len(chunk)
            if total > _MAX_UPLOAD_BYTES:
                raw_video_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File exceeds 512 MB limit")
            out.write(chunk)

    _create_job(background_tasks, job_id, raw_video_path, activity_description, station_no, activity_no, fast_mode)
    return JobStatusResponse(job_id=job_id, status="QUEUED")


@app.post("/api/v1/analyze/sample", response_model=JobStatusResponse)
async def analyze_sample_video(
    background_tasks: BackgroundTasks,
    activity_description: str = "ASSY WITH PRESS OPERATION",
    station_no: str = "",
    activity_no: str = "",
):
    """Runs the pipeline against a bundled sample video."""
    sample_path = ROOT_DIR / "data" / "samples" / "assy_with_press_operation.mp4"
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail="Sample video not available on this server")

    job_id = str(uuid.uuid4())
    raw_video_path = UPLOAD_DIR / f"{job_id}_sample.mp4"
    shutil.copy(sample_path, raw_video_path)

    _create_job(background_tasks, job_id, raw_video_path, activity_description, station_no, activity_no)
    return JobStatusResponse(job_id=job_id, status="QUEUED")


@app.post("/api/v1/analyze/demo", response_model=JobStatusResponse)
async def analyze_demo_video(
    activity_description: str = "KIT ASSEMBLY OPERATION",
    station_no: str = "ST-01",
    activity_no: str = "A-101",
):
    """Instantly generates a pre-analyzed demo job with complete MOST rows and Excel report."""
    sample_path = ROOT_DIR / "data" / "samples" / "assy_with_press_operation.mp4"

    job_id = str(uuid.uuid4())
    raw_video_path = UPLOAD_DIR / f"{job_id}_demo.mp4"
    if sample_path.exists():
        shutil.copy(sample_path, raw_video_path)

    output_excel_path = UPLOAD_DIR / f"{job_id}_most_analysis.xlsx"

    # Pre-packaged motion sequence for demo video
    motion_defs = [
        (0.0, 5.2, "REACH AND GRASP PARTS KIT FROM BIN", "G", [1, 0, 1, 1, 0, 1, 0], 35, 1, "WITHIN REACH, GRASP THE FIXTURE"),
        (5.2, 12.8, "MOVE PARTS TO WORKSTATION TABLE", "G", [1, 0, 3, 1, 0, 1, 0], 0, 1, "MOVE PARTS TO FIXTURE LOCATION"),
        (12.8, 22.0, "ALIGN AND POSITION COMPONENTS INTO JIG", "C", [1, 1, 1, 1, 0, 0, 0], 0, 1, "POSITION COMPONENT IN JIG"),
        (22.0, 31.5, "ACTUATE PRESS CONTROL LEVER", "C", [1, 1, 1, 1, 0, 0, 0], 50, 1, "ACTUATE PRESS CONTROL LEVER"),
        (31.5, 42.1, "INSPECT FASTENER ALIGNMENT AND FIT", "G", [1, 0, 1, 1, 0, 1, 0], 40, 1, "INSPECT ALIGNMENT AND FIT"),
        (42.1, 54.6, "GRASP SUB-ASSEMBLY CONNECTOR", "G", [1, 0, 1, 1, 0, 1, 0], 35, 1, "GRASP SUB-ASSEMBLY CONNECTOR"),
        (54.6, 68.0, "FASTEN SCREWS WITH ELECTRIC DRIVER", "C", [1, 1, 1, 1, 0, 0, 0], 50, 1, "FASTEN SCREWS WITH ELECTRIC DRIVER"),
        (68.0, 81.4, "REMOVE COMPLETED KIT FROM FIXTURE", "G", [1, 0, 1, 1, 0, 1, 0], 35, 1, "REMOVE COMPLETED KIT FROM FIXTURE"),
        (81.4, 96.2, "TRANSFER FINISHED ASSEMBLY TO TRAY", "G", [1, 0, 3, 1, 0, 1, 0], 0, 1, "TRANSFER FINISHED ASSEMBLY TO TRAY"),
        (96.2, 112.0, "RETURN HANDS TO NEUTRAL READY POSITION", "G", [1, 0, 1, 1, 0, 1, 0], 35, 1, "RETURN HANDS TO NEUTRAL READY POSITION"),
    ]

    segments = []
    rows = []
    flags = []

    for i, (t0, t1, desc, card, params, muda, freq, upper_desc) in enumerate(motion_defs):
        seg = Segment(
            segment_id=i + 1,
            source_video_uri=str(raw_video_path),
            t_start_sec=t0,
            t_end_sec=t1,
            description=desc,
            human_movement_state="ACTUATING" if card in ("A", "P") else "REACHING",
            machine_state="ACTUATING" if card == "A" else "IDLE",
            model_version="demo-v1",
            prompt_version="demo-v1",
        )
        cls = Classification(
            data_card=card,
            param_values=params,
            muda_ref=muda,
            freq=freq,
            confidence=0.95 if card != "P" else 0.72,
            model_version="demo-v1",
            prompt_version="demo-v1",
        )
        r = build_most_row(seg, cls, s_no=i + 1, activity_description=activity_description)
        r.station_no = station_no
        r.activity_no = activity_no
        segments.append(seg)
        rows.append(r)

        if cls.confidence < 0.8:
            flags.append(
                ReviewFlag(
                    segment_id=i + 1,
                    reason=f"Low confidence ({cls.confidence*100:.0f}%) on classification card {card}",
                    confidence=cls.confidence,
                    attempted_data_card=card,
                    attempted_param_values=params,
                    attempted_muda_ref=muda,
                )
            )

    write_most_analysis_workbook(rows, TEMPLATE_PATH, output_excel_path, activity_description)
    engine = HumanReviewEngine(rows, segments, flags)

    JOBS[job_id] = {
        "status": "COMPLETED",
        "phase": "COMPLETED",
        "started_at": time.monotonic() - 30.0,
        "completed_at": time.monotonic(),
        "raw_video_path": raw_video_path,
        "output_excel_path": output_excel_path,
        "activity_description": activity_description,
        "station_no": station_no,
        "activity_no": activity_no,
        "rows": rows,
        "segments": segments,
        "flags": flags,
        "review_engine": engine,
        "excel_path": output_excel_path,
    }

    return JobStatusResponse(
        job_id=job_id,
        status="COMPLETED",
        phase="COMPLETED",
        row_count=len(rows),
        flag_count=len(flags),
        elapsed_sec=30.0,
        estimated_manual_sec=len(rows) * MANUAL_SEC_PER_MOTION,
    )


@app.get("/api/v1/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Retrieve job processing status and summary metrics."""
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    engine: HumanReviewEngine | None = job.get("review_engine")
    rows = engine.get_finalized_rows() if engine else job.get("rows", [])
    flag_count = len(engine.get_pending_flags()) if engine else len(job.get("flags", []))

    started_at = job.get("started_at")
    elapsed_sec = None
    if started_at is not None:
        end = job.get("completed_at", time.monotonic())
        elapsed_sec = round(end - started_at, 1)

    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        phase=job.get("phase", job["status"]),
        row_count=len(rows),
        flag_count=flag_count,
        error=job.get("error"),
        elapsed_sec=elapsed_sec,
        estimated_manual_sec=len(rows) * MANUAL_SEC_PER_MOTION if rows else None,
    )


@app.get("/api/v1/jobs/{job_id}/rows")
async def get_job_rows(job_id: str):
    """Returns whatever MostRow data currently exists for this job, as JSON."""
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    engine: HumanReviewEngine | None = job.get("review_engine")
    rows: list[MostRow] = engine.get_finalized_rows() if engine else job.get("rows", [])
    return [r.model_dump() for r in sorted(rows, key=lambda r: r.s_no)]


_RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")
_CHUNK_SIZE = 1024 * 1024


def _ranged_file_response(file_path: Path, range_header: str | None, media_type: str) -> StreamingResponse:
    file_size = file_path.stat().st_size
    start, end = 0, file_size - 1

    if range_header:
        match = _RANGE_RE.match(range_header)
        if match:
            if match.group(1):
                start = int(match.group(1))
            if match.group(2):
                end = int(match.group(2))

    start = max(0, start)
    end = min(file_size - 1, end)
    length = end - start + 1

    def iterfile():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(_CHUNK_SIZE, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(length),
    }
    status_code = 206 if range_header else 200
    return StreamingResponse(iterfile(), status_code=status_code, headers=headers, media_type=media_type)


@app.get("/api/v1/jobs/{job_id}/video")
async def get_job_video(job_id: str, request: Request):
    """Streams the original uploaded video back with Range header support for seeking."""
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    video_path: Path = job.get("raw_video_path")
    if not video_path or not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file missing")

    range_header = request.headers.get("range")
    return _ranged_file_response(video_path, range_header, "video/mp4")


@app.get("/api/v1/jobs/{job_id}/stream")
async def stream_job_events(job_id: str):
    """Server-Sent Events (SSE) stream for live pipeline progress."""
    async def event_generator():
        last_yielded_idx = 0
        while True:
            events = JOB_EVENTS.get(job_id, [])
            # Yield any new events
            while last_yielded_idx < len(events):
                event = events[last_yielded_idx]
                yield f"data: {json.dumps(event)}\n\n"
                last_yielded_idx += 1
            
            # Check if job is terminal
            job = JOBS.get(job_id)
            if job and job.get("status") in ("COMPLETED", "FAILED"):
                # Job finished, close stream
                break
                
            await asyncio.sleep(0.5)

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)


@app.get("/api/v1/jobs/{job_id}/preview")
async def get_job_preview(job_id: str):
    """Returns the blurred video frame (first frame) as a thumbnail."""
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # The blurred video is generated in Stage 2 (PREPROCESSING).
    # If the phase is beyond PREPROCESSING, the blurred video exists.
    video_path: Path = job.get("raw_video_path")
    if not video_path:
        raise HTTPException(status_code=404, detail="Video file missing")
        
    blurred_path = UPLOAD_DIR / f"_blurred_{video_path.name}"
    
    if not blurred_path.exists():
        # Fall back to raw video if not blurred yet
        if video_path.exists():
            blurred_path = video_path
        else:
            raise HTTPException(status_code=404, detail="Preview not available yet")

    # In a real app we'd extract a thumbnail using opencv here.
    # For now, just stream the beginning of the video file as the preview.
    # The browser `<video>` tag can render a thumbnail from a video file.
    return FileResponse(blurred_path, media_type="video/mp4")


@app.get("/api/v1/jobs/{job_id}/excel")
async def download_excel_report(job_id: str):
    """Download the finalized formatted Excel report deliverable."""
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "COMPLETED":
        raise HTTPException(status_code=400, detail=f"Job is in state {job['status']}")

    excel_path: Path = job["excel_path"]
    if not excel_path.exists():
        raise HTTPException(status_code=404, detail="Excel output file missing")

    return FileResponse(
        path=excel_path,
        filename=excel_path.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.get("/api/v1/jobs/{job_id}/flags")
async def get_review_flags(job_id: str):
    """Get unresolved review flags requiring human engineer inspection."""
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    engine: HumanReviewEngine | None = job.get("review_engine")
    if not engine:
        return []
    return [f.model_dump() for f in engine.get_pending_flags()]


@app.post("/api/v1/jobs/{job_id}/review")
async def submit_human_review(job_id: str, review: ReviewSubmission):
    """Submit a human engineer correction for a flagged segment."""
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    engine: HumanReviewEngine | None = job.get("review_engine")
    if not engine:
        raise HTTPException(status_code=400, detail="Job has no active review engine")

    updated_row = engine.update_row_classification(
        segment_id=review.segment_id,
        data_card=review.data_card,
        param_values=review.param_values,
        muda_ref=review.muda_ref,
        activity_description=review.activity_description,
        freq=review.freq,
    )

    # Re-write excel with updated rows
    final_rows = engine.get_finalized_rows()
    write_most_analysis_workbook(
        final_rows,
        TEMPLATE_PATH,
        job["excel_path"],
        job["activity_description"],
    )

    return {"status": "SUCCESS", "updated_row": updated_row.model_dump()}


# ── Frontend static files (production) ────────────────────────────────────────
# In production the React app is built into frontend/dist/ by the Dockerfile.
# FastAPI serves it at "/", so the entire app runs from a single Railway service.
# In local dev this is skipped (the dist dir won't exist) and Vite handles it.
_FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
if _FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIST), html=True), name="frontend")
