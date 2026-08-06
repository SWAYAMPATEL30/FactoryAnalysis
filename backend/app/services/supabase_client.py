"""Supabase Client & Database Service Layer.

Provides secure server-side access to Supabase PostgreSQL database via
SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

SECURITY RULES:
- Never expose SUPABASE_SERVICE_ROLE_KEY to the React frontend.
- Never place service role key in VITE_* environment variables.
- Service role key stays strictly on the backend.
- Credentials are loaded from environment variables (backend/.env), never hardcoded.
"""
import os
import logging
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """Retrieves or initializes the server-side Supabase client.
    Returns None if credentials are missing or invalid."""
    global _client
    if _client is not None:
        return _client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        logger.info("Supabase credentials not configured in backend environment.")
        return None

    try:
        _client = create_client(url, key)
        return _client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


def get_or_create_dev_organization() -> Optional[Dict[str, Any]]:
    """[DEVELOPMENT-ONLY SEED]
    Fetches the first available organization or creates a dev-only seed organization
    if none exists. Marked explicitly as development-only.
    """
    client = get_supabase_client()
    if not client:
        return None

    try:
        res = client.table("organizations").select("*").limit(1).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]

        # Create a dummy user for dev seed owner if needed
        dev_user_id = "00000000-0000-0000-0000-000000000000"
        org_data = {
            "name": "Dev Factory (Development-Only)",
            "slug": "dev-factory-seed",
            "owner_id": dev_user_id,
        }
        res = client.table("organizations").insert(org_data).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.warning(f"Development-only org lookup/seed skipped: {e}")
    return None


def get_workstations(organization_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch workstations from Supabase. If organization_id is provided, filter by it."""
    client = get_supabase_client()
    if not client:
        return []

    try:
        query = client.table("workstations").select("*")
        if organization_id:
            query = query.eq("organization_id", organization_id)
        res = query.order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching workstations from Supabase: {e}")
        return []


def create_workstation(
    name: str,
    code: str,
    description: str = "",
    organization_id: Optional[str] = None,
    created_by: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Create a new workstation in Supabase."""
    client = get_supabase_client()
    if not client:
        return None

    if not organization_id:
        dev_org = get_or_create_dev_organization()
        if dev_org:
            organization_id = dev_org["id"]
        else:
            logger.error("Cannot create workstation: no organization_id provided")
            return None

    data = {
        "organization_id": organization_id,
        "name": name,
        "code": code,
        "description": description,
        "created_by": created_by or "00000000-0000-0000-0000-000000000000",
    }
    try:
        res = client.table("workstations").insert(data).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.error(f"Failed to create workstation in Supabase: {e}")
    return None


def save_video_job_to_db(job_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Persist a video job record into the video_jobs Supabase table."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        res = client.table("video_jobs").upsert(job_data).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.error(f"Failed to save video_job to Supabase: {e}")
    return None


def list_video_jobs_from_db(
    workstation_id: Optional[str] = None, organization_id: Optional[str] = None, limit: int = 50
) -> List[Dict[str, Any]]:
    """Fetch video job history from Supabase."""
    client = get_supabase_client()
    if not client:
        return []

    try:
        query = client.table("video_jobs").select("*")
        if workstation_id:
            query = query.eq("workstation_id", workstation_id)
        if organization_id:
            query = query.eq("organization_id", organization_id)
        res = query.order("created_at", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error listing video jobs from Supabase: {e}")
        return []


def save_segments_to_db(
    job_id: str,
    segments: List[Any],
    workstation_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> None:
    """Save segment records to video_segments table."""
    client = get_supabase_client()
    if not client or not segments:
        return

    records = []
    for s in segments:
        data = s.model_dump() if hasattr(s, "model_dump") else s
        records.append({
            "job_id": job_id,
            "organization_id": organization_id or "00000000-0000-0000-0000-000000000000",
            "workstation_id": workstation_id or "00000000-0000-0000-0000-000000000000",
            "segment_index": data.get("segment_id", 0),
            "t_start_sec": data.get("t_start_sec", 0.0),
            "t_end_sec": data.get("t_end_sec", 0.0),
            "description": data.get("description", ""),
            "human_movement_state": data.get("human_movement_state", "MOVE"),
            "machine_state": data.get("machine_state", "IDLE"),
            "model_version": data.get("model_version", ""),
            "prompt_version": data.get("prompt_version", ""),
        })

    try:
        client.table("video_segments").insert(records).execute()
    except Exception as e:
        logger.error(f"Failed to save video_segments to Supabase: {e}")


def save_most_rows_to_db(
    job_id: str,
    rows: List[Any],
    workstation_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> None:
    """Save MostRow records to most_rows table."""
    client = get_supabase_client()
    if not client or not rows:
        return

    records = []
    for r in rows:
        data = r.model_dump() if hasattr(r, "model_dump") else r
        records.append({
            "job_id": job_id,
            "organization_id": organization_id or "00000000-0000-0000-0000-000000000000",
            "workstation_id": workstation_id or "00000000-0000-0000-0000-000000000000",
            "s_no": data.get("s_no", 1),
            "station_no": data.get("station_no", ""),
            "activity_no": data.get("activity_no", ""),
            "activity_description": data.get("activity_description", ""),
            "data_card": data.get("data_card", "G"),
            "param_values": data.get("param_values", []),
            "most_code": data.get("most_code", ""),
            "freq": data.get("freq", 1),
            "tmu": data.get("tmu", 0.0),
            "elemental_description": data.get("elemental_description", ""),
            "operator": data.get("operator", 1),
            "muda_ref": data.get("muda_ref", 0),
            "total_time_sec": data.get("total_time_sec", 0.0),
            "online_offline_mode": data.get("online_offline_mode", "ONLINE"),
            "va_sec": data.get("va_sec", 0.0),
            "nvan_sec": data.get("nvan_sec", 0.0),
            "sva_sec": data.get("sva_sec", 0.0),
            "nva_sec": data.get("nva_sec", 0.0),
            "category": data.get("category", ""),
            "source_video_uri": data.get("source_video_uri", ""),
            "t_start_sec": data.get("t_start_sec", 0.0),
            "t_end_sec": data.get("t_end_sec", 0.0),
            "segment_model_version": data.get("segment_model_version", ""),
            "segment_prompt_version": data.get("segment_prompt_version", ""),
            "classification_model_version": data.get("classification_model_version", ""),
            "classification_prompt_version": data.get("classification_prompt_version", ""),
            "confidence": data.get("confidence", 1.0),
            "human_corrected": data.get("human_corrected", False),
            "activity_movement_details": data.get("activity_movement_details", ""),
            "activity_duration_sec": data.get("activity_duration_sec", 0.0),
            "activity_timeline": data.get("activity_timeline", ""),
            "uppercase_elemental_description": data.get("uppercase_elemental_description", ""),
        })

    try:
        client.table("most_rows").insert(records).execute()
    except Exception as e:
        logger.error(f"Failed to save most_rows to Supabase: {e}")


def save_review_flags_to_db(
    job_id: str,
    flags: List[Any],
    workstation_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> None:
    """Save review flags to review_flags table."""
    client = get_supabase_client()
    if not client or not flags:
        return

    records = []
    for f in flags:
        data = f.model_dump() if hasattr(f, "model_dump") else f
        records.append({
            "job_id": job_id,
            "organization_id": organization_id or "00000000-0000-0000-0000-000000000000",
            "workstation_id": workstation_id or "00000000-0000-0000-0000-000000000000",
            "segment_id": data.get("segment_id", 0),
            "reason": data.get("reason", ""),
            "confidence": data.get("confidence"),
            "status": "pending",
        })

    try:
        client.table("review_flags").insert(records).execute()
    except Exception as e:
        logger.error(f"Failed to save review_flags to Supabase: {e}")
