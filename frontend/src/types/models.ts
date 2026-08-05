// Shared domain models — mirrors what Firestore would store.
// localStorage-backed for Phase 1. Swap context providers for Firebase in Phase 2.

export type Plan = "starter" | "growth" | "enterprise";
export type Role = "admin" | "engineer" | "viewer";
export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
export type Trend = "improving" | "stable" | "regressing" | "new";

export interface Company {
  id: string;
  name: string;
  plan: Plan;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  role: Role;
}

export interface Workstation {
  id: string;
  companyId: string;
  name: string;
  description: string;
  line: string;
  createdAt: string; // ISO date
}

export interface VideoEntry {
  id: string;
  workstationId: string;
  companyId: string;
  jobId: string;
  fileName: string;
  label?: string;           // human-friendly name shown in UI (auto-generated on upload)
  recordedDate: string;     // ISO date — when footage was actually shot
  uploadedAt: string;       // ISO date — when uploaded to the system
  status: JobStatus;
  cycletime_tmu?: number;   // total TMU for quick display
  motion_counts?: { G: number; C: number; T: number }; // General / Controlled / Tool
  rowCount?: number;
  flagCount?: number;
}

// Derived helper
export function getTrend(videos: VideoEntry[]): Trend {
  const completed = videos
    .filter((v) => v.status === "COMPLETED" && v.cycletime_tmu != null)
    .sort((a, b) => a.recordedDate.localeCompare(b.recordedDate));
  if (completed.length < 2) return "new";
  const last = completed[completed.length - 1].cycletime_tmu!;
  const prev = completed[completed.length - 2].cycletime_tmu!;
  const pct = (last - prev) / prev;
  if (pct < -0.02) return "improving";
  if (pct > 0.02) return "regressing";
  return "stable";
}

export function tmuToCycleTime(tmu: number): string {
  const seconds = tmu * 0.036; // 1 TMU = 0.036 seconds
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}
