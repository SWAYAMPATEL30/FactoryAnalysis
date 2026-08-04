import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { VideoEntry, Workstation } from "../types/models";

// ── Seed data ──────────────────────────────────────────────────────────────────
const SEED_WORKSTATIONS: Workstation[] = [
  // BorgWarner
  { id: "ws-1", companyId: "borgwarner", name: "Station 1 – Cam Phaser Assembly", description: "Assembly of cam phaser components onto crankshaft sub-assembly. High-precision torque fastening.", line: "Line 2B", createdAt: "2026-06-01" },
  { id: "ws-2", companyId: "borgwarner", name: "Station 2 – Press Fit Operation", description: "Hydraulic press fit of bearing rings into housing. Force-controlled, 1.8 kN target.", line: "Line 2B", createdAt: "2026-06-01" },
  { id: "ws-5", companyId: "borgwarner", name: "Station 5 – Kitting & Packing", description: "Component kitting and final packaging for delivery. Pick-and-place into foam-lined trays.", line: "Line 1", createdAt: "2026-08-15" },
  // Global Tech
  { id: "ws-gt1", companyId: "globaltech", name: "Assembly Line A – End Effector", description: "Robot end effector sub-assembly. 6-axis wrist with electrical harness routing.", line: "Line A", createdAt: "2026-05-10" },
  { id: "ws-gt2", companyId: "globaltech", name: "QC Station 3 – Torque Verify", description: "Torque verification and pass/fail labeling. Click-type wrench with digital readout.", line: "Line C", createdAt: "2026-05-10" },
];

const SEED_VIDEOS: VideoEntry[] = [
  // ws-1 — improving over 3 months
  { id: "v1", workstationId: "ws-1", companyId: "borgwarner", jobId: "demo-job-1", fileName: "station1_july.mp4", recordedDate: "2026-07-15", uploadedAt: "2026-07-15", status: "COMPLETED", cycletime_tmu: 1240, motion_counts: { G: 6, C: 3, T: 1 }, rowCount: 10, flagCount: 1 },
  { id: "v2", workstationId: "ws-1", companyId: "borgwarner", jobId: "demo-job-2", fileName: "station1_aug.mp4", recordedDate: "2026-08-12", uploadedAt: "2026-08-12", status: "COMPLETED", cycletime_tmu: 1185, motion_counts: { G: 5, C: 4, T: 1 }, rowCount: 10, flagCount: 0 },
  { id: "v3", workstationId: "ws-1", companyId: "borgwarner", jobId: "demo-job-3", fileName: "station1_sep.mp4", recordedDate: "2026-09-03", uploadedAt: "2026-09-03", status: "COMPLETED", cycletime_tmu: 1150, motion_counts: { G: 5, C: 4, T: 1 }, rowCount: 10, flagCount: 0 },
  // ws-2 — regressing
  { id: "v4", workstationId: "ws-2", companyId: "borgwarner", jobId: "demo-job-4", fileName: "station2_aug.mp4", recordedDate: "2026-08-05", uploadedAt: "2026-08-05", status: "COMPLETED", cycletime_tmu: 980, motion_counts: { G: 4, C: 3, T: 1 }, rowCount: 8, flagCount: 0 },
  { id: "v5", workstationId: "ws-2", companyId: "borgwarner", jobId: "demo-job-5", fileName: "station2_sep.mp4", recordedDate: "2026-09-01", uploadedAt: "2026-09-01", status: "COMPLETED", cycletime_tmu: 1020, motion_counts: { G: 4, C: 4, T: 1 }, rowCount: 9, flagCount: 1 },
  // ws-5 — new, single study
  { id: "v6", workstationId: "ws-5", companyId: "borgwarner", jobId: "demo-job-6", fileName: "station5_sep.mp4", recordedDate: "2026-09-10", uploadedAt: "2026-09-10", status: "COMPLETED", cycletime_tmu: 640, motion_counts: { G: 3, C: 1, T: 2 }, rowCount: 6, flagCount: 0 },
  // Global Tech
  { id: "v7", workstationId: "ws-gt1", companyId: "globaltech", jobId: "demo-job-7", fileName: "endeffector_aug.mp4", recordedDate: "2026-08-20", uploadedAt: "2026-08-20", status: "COMPLETED", cycletime_tmu: 1580, motion_counts: { G: 7, C: 5, T: 2 }, rowCount: 14, flagCount: 2 },
  { id: "v8", workstationId: "ws-gt2", companyId: "globaltech", jobId: "demo-job-8", fileName: "qc3_aug.mp4", recordedDate: "2026-08-22", uploadedAt: "2026-08-22", status: "COMPLETED", cycletime_tmu: 420, motion_counts: { G: 3, C: 1, T: 1 }, rowCount: 5, flagCount: 0 },
];

// ── Types ──────────────────────────────────────────────────────────────────────
interface WorkstationContextValue {
  workstations: Workstation[];
  videos: VideoEntry[];
  getWorkstationsForCompany: (companyId: string) => Workstation[];
  getVideosForWorkstation: (workstationId: string) => VideoEntry[];
  createWorkstation: (data: Omit<Workstation, "id" | "createdAt">) => Workstation;
  addVideo: (entry: Omit<VideoEntry, "id">) => VideoEntry;
  updateVideo: (id: string, patch: Partial<VideoEntry>) => void;
}

const WorkstationContext = createContext<WorkstationContextValue | null>(null);

const WS_KEY = "fa_workstations";
const VID_KEY = "fa_videos";

function loadOrSeed<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* ignore */ }
  return seed;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function WorkstationProvider({ children }: { children: ReactNode }) {
  const [workstations, setWorkstations] = useState<Workstation[]>(() =>
    loadOrSeed(WS_KEY, SEED_WORKSTATIONS)
  );
  const [videos, setVideos] = useState<VideoEntry[]>(() =>
    loadOrSeed(VID_KEY, SEED_VIDEOS)
  );

  useEffect(() => { localStorage.setItem(WS_KEY, JSON.stringify(workstations)); }, [workstations]);
  useEffect(() => { localStorage.setItem(VID_KEY, JSON.stringify(videos)); }, [videos]);

  const getWorkstationsForCompany = (companyId: string) =>
    workstations.filter((w) => w.companyId === companyId);

  const getVideosForWorkstation = (workstationId: string) =>
    videos
      .filter((v) => v.workstationId === workstationId)
      .sort((a, b) => b.recordedDate.localeCompare(a.recordedDate));

  function createWorkstation(data: Omit<Workstation, "id" | "createdAt">): Workstation {
    const ws: Workstation = { ...data, id: `ws-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
    setWorkstations((prev) => [...prev, ws]);
    return ws;
  }

  function addVideo(entry: Omit<VideoEntry, "id">): VideoEntry {
    const vid: VideoEntry = { ...entry, id: `v-${Date.now()}` };
    setVideos((prev) => [...prev, vid]);
    return vid;
  }

  function updateVideo(id: string, patch: Partial<VideoEntry>) {
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  return (
    <WorkstationContext.Provider value={{ workstations, videos, getWorkstationsForCompany, getVideosForWorkstation, createWorkstation, addVideo, updateVideo }}>
      {children}
    </WorkstationContext.Provider>
  );
}

export function useWorkstations(): WorkstationContextValue {
  const ctx = useContext(WorkstationContext);
  if (!ctx) throw new Error("useWorkstations must be used inside WorkstationProvider");
  return ctx;
}
