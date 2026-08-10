"""Pydantic schemas for Stage 10 AI Cycle-Improvement Insights.

Guarantees structured output for Bottleneck Identification, Non-Value-Add Elimination Candidates,
Equipment/Method Upgrade Suggestions, and Projected Cycle Time Summary with strict guardrails.
"""
from __future__ import annotations

from typing import List
from pydantic import BaseModel, Field


class BottleneckIdentification(BaseModel):
    activity_name: str = Field(description="Name of the single highest time-consuming activity from Pareto ranking")
    s_no: int = Field(description="Sequence number of the bottleneck activity")
    time_sec: float = Field(description="Time spent in seconds on this activity")
    tmu: float = Field(description="TMU value for this activity")
    pct_of_cycle: float = Field(description="Percentage share of total workstation cycle time")
    reason: str = Field(
        description="Plain-language, data-grounded explanation of why this activity is slow based on distance, tool, or motion params"
    )


class EliminationCandidate(BaseModel):
    s_no: int = Field(description="Sequence number of the candidate motion")
    activity_name: str = Field(description="Name of the motion flagged as non-value-add waste")
    current_time_sec: float = Field(description="Time cost of this motion in seconds")
    waste_type: str = Field(description="Lean waste category: e.g., 'Excessive Reach / Travel', 'Redundant Repositioning', 'Waiting / Idle'")
    reason: str = Field(description="Concrete, data-grounded reason explaining why this motion is reducible or eliminable")
    potential_saving_sec: float = Field(description="Estimated time saving in seconds if eliminated/reduced")


class EquipmentUpgradeSuggestion(BaseModel):
    s_no: int = Field(description="Sequence number of the target motion")
    activity_name: str = Field(description="Activity name involving equipment or tool use")
    current_tool_or_method: str = Field(description="Currently detected tool, fixture, or manual method from CV data")
    suggested_upgrade: str = Field(
        description="Suggested alternative equipment or method category (e.g., 'Electric Torque Screwdriver with Preset Stop')"
    )
    projected_time_sec: float = Field(description="Estimated new time for this motion in seconds if adopted")
    time_saved_sec: float = Field(description="Estimated seconds saved per cycle")
    search_url: str | None = Field(
        default=None,
        description="Direct web search URL to verify commercial product models, pricing, and specs from industrial suppliers"
    )
    disclaimer: str = Field(
        default="Suggested — verify before purchasing",
        description="Mandatory guardrail label indicating AI suggestion requiring engineer verification"
    )


class ProjectedCycleTimeSummary(BaseModel):
    current_cycle_sec: float = Field(description="Original baseline cycle time in seconds")
    current_tmu: float = Field(description="Original baseline cycle time in TMU")
    projected_cycle_sec: float = Field(description="Projected cycle time after applying valid savings in seconds")
    projected_tmu: float = Field(description="Projected cycle time in TMU")
    total_saving_sec: float = Field(description="Total time saved across all suggestions in seconds")
    pct_reduction: float = Field(description="Percentage reduction in total cycle time")
    current_va_sec: float = Field(description="Baseline Value-Add time in seconds")
    projected_va_sec: float = Field(description="Projected Value-Add time in seconds")
    current_nva_sec: float = Field(description="Baseline Non-Value-Add time in seconds")
    projected_nva_sec: float = Field(description="Projected Non-Value-Add time in seconds")
    disclaimer: str = Field(
        default="Projected — based on suggested changes, not a measured result",
        description="Mandatory guardrail label indicating estimate"
    )


class ImprovementInsights(BaseModel):
    job_id: str
    bottleneck: BottleneckIdentification
    elimination_candidates: List[EliminationCandidate] = Field(default_factory=list)
    equipment_upgrades: List[EquipmentUpgradeSuggestion] = Field(default_factory=list)
    projected_summary: ProjectedCycleTimeSummary
    historical_trend_note: str | None = Field(
        default=None,
        description="Contextual note if historical trend data exists for this workstation"
    )
    generated_at: float = Field(description="Epoch timestamp when insights were generated")
