import { useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useWorkstations } from "../../context/WorkstationContext";
import { CycleTimeTrendChart } from "../../components/charts/CycleTimeTrendChart";
import { MotionBreakdownChart } from "../../components/charts/MotionBreakdownChart";
import { PipelineStatusCard } from "../../components/PipelineStatusCard";
import { tmuToCycleTime } from "../../types/models";
import type { VideoEntry } from "../../types/models";
import { analyzeVideo } from "../../api/client";
import type { JobStatusResponse } from "../../api/types";

// ── helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function makeLabel(stationName: string, recordedDate: string): string {
  return `${stationName.split("–")[0].trim()} · ${formatDate(recordedDate)}`;
}

// ── Compare panel ──────────────────────────────────────────────────────────────
function ComparePanel({ a, b }: { a: VideoEntry; b: VideoEntry }) {
  const diff =
    b.cycletime_tmu != null && a.cycletime_tmu != null
      ? ((b.cycletime_tmu - a.cycletime_tmu) / a.cycletime_tmu) * 100
      : null;
  return (
    <div className="rounded-xl border border-accent/30 bg-accent-soft p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display font-bold text-lg uppercase text-ink">Comparison</h3>
        {diff !== null && (
          <span
            className={`font-mono font-bold text-sm px-3 py-1 rounded-full ${
              diff < 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {diff > 0 ? "+" : ""}
            {diff.toFixed(1)}% cycle time
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[a, b].map((v, i) => (
          <div key={v.id} className="rounded-lg border border-line bg-raised p-4">
            <div className="text-xs text-ink-faint mb-1">
              {i === 0 ? "Earlier" : "Later"} · {v.recordedDate}
            </div>
            <div className="font-mono font-extrabold text-3xl text-ink mb-0.5">
              {v.cycletime_tmu?.toLocaleString() ?? "—"}
            </div>
            <div className="text-xs text-ink-dim">
              TMU · {tmuToCycleTime(v.cycletime_tmu ?? 0)}
            </div>
            {v.motion_counts && (
              <div className="mt-3">
                <MotionBreakdownChart
                  G={v.motion_counts.G}
                  C={v.motion_counts.C}
                  T={v.motion_counts.T}
                  size={100}
                />
              </div>
            )}
            <Link
              to={`/app/jobs/${v.jobId}`}
              className="inline-block mt-3 text-xs text-accent hover:underline"
            >
              View full report →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Upload form ────────────────────────────────────────────────────────────────
function UploadForm({
  workstationId,
  workstationName,
  companyId,
  onSuccess,
}: {
  workstationId: string;
  workstationName: string;
  companyId: string;
  onSuccess: (jobId: string, videoId: string) => void;
}) {
  const { addVideo } = useWorkstations();
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState("ASSY WITH PRESS OPERATION");
  const [fileError, setFileError] = useState("");
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () =>
      analyzeVideo(file!, {
        activityDescription: desc,
        stationNo: workstationId,
        activityNo: "",
        fastMode: false,
      }),
    onSuccess: (data) => {
      const label = makeLabel(workstationName, date);
      const vid = addVideo({
        workstationId,
        companyId,
        jobId: data.job_id,
        fileName: file!.name,
        label,
        recordedDate: date,
        uploadedAt: new Date().toISOString().slice(0, 10),
        status: "PROCESSING",
      });
      onSuccess(data.job_id, vid.id);
      navigate(`/app/jobs/${data.job_id}`);
    },
  });

  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setFileError("Please upload a video file (.mp4, .mov, etc)");
      return;
    }
    if (f.size > 512 * 1024 * 1024) {
      setFileError("File exceeds 512 MB limit");
      return;
    }
    setFileError("");
    setFile(f);

    // Extract first frame as thumbnail using canvas
    const url = URL.createObjectURL(f);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;
      canvas.getContext("2d")?.drawImage(video, 0, 0, 160, 90);
      setThumbUrl(canvas.toDataURL("image/jpeg", 0.8));
      URL.revokeObjectURL(url);
    };
  }

  return (
    <div className="rounded-xl border border-line bg-raised p-4 sm:p-6 mb-6">
      <h3 className="font-display font-bold text-lg uppercase text-ink mb-4">Upload new study</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-ink-faint uppercase tracking-wide mb-1.5">
            Activity description
          </label>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full rounded-md border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent bg-raised min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-faint uppercase tracking-wide mb-1.5">
            Date footage recorded
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent bg-raised min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-faint uppercase tracking-wide mb-1.5">
            Video file
          </label>
          <div
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-md border border-dashed border-line hover:border-accent transition-colors px-3 py-2.5 text-sm text-ink-faint min-h-[44px] flex items-center"
          >
            {file ? file.name : "Click to choose video…"}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {fileError && <p className="text-xs text-red-500 mt-1">{fileError}</p>}
        </div>
      </div>

      {/* Thumbnail preview */}
      {thumbUrl && (
        <div className="mb-4 flex items-center gap-3">
          <img
            src={thumbUrl}
            alt="Video thumbnail"
            className="w-20 h-12 object-cover rounded-md border border-line"
          />
          <span className="text-xs text-ink-faint">First frame preview</span>
        </div>
      )}

      {mutation.isError && (
        <p className="text-sm text-red-500 mb-3">{(mutation.error as Error).message}</p>
      )}
      <button
        disabled={!file || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[44px]"
      >
        {mutation.isPending ? "Uploading & analyzing…" : "Run analysis"}
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export function WorkstationDetailPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const { company, user } = useAuth();
  const { workstations, getVideosForWorkstation, updateVideo } = useWorkstations();
  const [showUpload, setShowUpload] = useState(false);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);

  const ws = workstations.find((w) => w.id === stationId);
  const videos = stationId ? getVideosForWorkstation(stationId) : [];
  const completed = videos.filter((v) => v.status === "COMPLETED");

  const canEdit = user?.role !== "viewer";

  // Called by PipelineStatusCard when a job finishes
  const handleJobComplete = useCallback(
    (videoId: string, data: JobStatusResponse) => {
      if (data.status === "COMPLETED") {
        updateVideo(videoId, {
          status: "COMPLETED",
          rowCount: data.row_count,
          flagCount: data.flag_count,
        });
      } else if (data.status === "FAILED") {
        updateVideo(videoId, { status: "FAILED" });
      }
    },
    [updateVideo]
  );

  if (!ws) {
    return (
      <div className="p-8 text-center text-ink-faint">
        <p className="text-lg mb-4">Workstation not found</p>
        <Link to="/app/workstations" className="text-accent hover:underline">
          ← Back to workstations
        </Link>
      </div>
    );
  }

  // Build chart series
  const chartSeries =
    completed.length > 0
      ? [
          {
            name: ws.name.split("–")[0].trim(),
            color: "#0e8f80",
            data: completed.map((v) => ({ date: v.recordedDate, tmu: v.cycletime_tmu! })),
          },
        ]
      : [];

  const compareA = compareIds ? completed.find((v) => v.id === compareIds[0]) : null;
  const compareB = compareIds ? completed.find((v) => v.id === compareIds[1]) : null;

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (!prev) return [id, id];
      const [a, b] = prev;
      if (a === id) return [b, b];
      if (b === id) return [a, id];
      return [a, id];
    });
  }

  return (
    <div className="px-4 py-6 sm:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-faint mb-6">
        <Link to="/app/workstations" className="hover:text-accent">
          Workstations
        </Link>
        <span>/</span>
        <span className="text-ink">{ws.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl uppercase text-ink">
            {ws.name}
          </h1>
          <div className="text-sm text-ink-faint mt-1">
            {ws.line} · {ws.description}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {completed.length >= 2 && (
            <button
              onClick={() => {
                const [a, b] = completed;
                setCompareIds([a.id, b.id]);
              }}
              className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-accent hover:text-accent transition-colors min-h-[44px]"
            >
              Compare studies
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors min-h-[44px]"
            >
              + Upload new study
            </button>
          )}
        </div>
      </div>

      {/* Upload form */}
      {showUpload && company && (
        <UploadForm
          workstationId={ws.id}
          workstationName={ws.name}
          companyId={company.id}
          onSuccess={() => setShowUpload(false)}
        />
      )}

      {/* Compare panel */}
      {compareIds && compareA && compareB && compareA.id !== compareB.id && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-ink">Side-by-side comparison</span>
            <button
              onClick={() => setCompareIds(null)}
              className="text-xs text-ink-faint hover:text-ink min-h-[44px] px-2"
            >
              Dismiss ✕
            </button>
          </div>
          <ComparePanel a={compareA} b={compareB} />
        </div>
      )}

      {/* Trend chart */}
      {chartSeries.length > 0 && (
        <div className="rounded-xl border border-line bg-raised p-4 sm:p-6 mb-6">
          <h2 className="font-semibold text-ink mb-1 text-sm">Cycle Time History</h2>
          <p className="text-xs text-ink-faint mb-4">
            TMU across all dated studies for this station
          </p>
          <CycleTimeTrendChart series={chartSeries} height={200} />
        </div>
      )}

      {/* Study history */}
      <div>
        <h2 className="font-display font-bold text-xl uppercase text-ink mb-4">Study history</h2>
        {videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-12 sm:p-16 text-center text-ink-faint">
            <p className="mb-2">No studies uploaded yet.</p>
            {canEdit && (
              <button
                onClick={() => setShowUpload(true)}
                className="text-accent hover:underline text-sm"
              >
                Upload the first study →
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {videos.map((v) => {
              const displayLabel = v.label ?? `Study — ${formatDate(v.recordedDate)}`;
              return (
                <div
                  key={v.id}
                  className={`rounded-xl border p-4 sm:p-5 transition-all ${
                    compareIds?.includes(v.id)
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-raised hover:border-line-strong"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status indicator */}
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${
                          v.status === "COMPLETED"
                            ? "bg-green-500"
                            : v.status === "PROCESSING"
                            ? "bg-amber-400 animate-pulse"
                            : v.status === "FAILED"
                            ? "bg-red-500"
                            : "bg-line-strong"
                        }`}
                      />
                      <div className="min-w-0">
                        {/* Label instead of raw filename */}
                        <div className="font-semibold text-ink text-sm truncate">{displayLabel}</div>
                        <div className="text-xs text-ink-faint">{v.recordedDate}</div>
                      </div>
                    </div>

                    {/* Right: TMU or status badge */}
                    <div className="flex items-center gap-3 shrink-0">
                      {v.status === "COMPLETED" && v.cycletime_tmu && (
                        <div className="text-right">
                          <div className="font-mono font-bold text-xl text-ink">
                            {v.cycletime_tmu.toLocaleString()}
                          </div>
                          <div className="text-xs text-ink-faint">
                            TMU · {tmuToCycleTime(v.cycletime_tmu)}
                          </div>
                        </div>
                      )}
                      {v.status === "FAILED" && (
                        <span className="text-xs font-medium text-red-600 bg-red-50 rounded-full px-3 py-1 border border-red-200">
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pipeline status card for in-progress jobs */}
                  {v.status === "PROCESSING" && (
                    <PipelineStatusCard
                      jobId={v.jobId}
                      onComplete={(data) => handleJobComplete(v.id, data)}
                    />
                  )}

                  {/* Completed study details */}
                  {v.status === "COMPLETED" && (
                    <div className="mt-4 flex items-center gap-4 flex-wrap">
                      {v.motion_counts && (
                        <MotionBreakdownChart
                          G={v.motion_counts.G}
                          C={v.motion_counts.C}
                          T={v.motion_counts.T}
                          size={80}
                        />
                      )}
                      <div className="flex items-center gap-3 text-xs text-ink-faint">
                        <span>{v.rowCount} motions</span>
                        {(v.flagCount ?? 0) > 0 && (
                          <span className="text-amber-600 font-medium">
                            {v.flagCount} flag(s)
                          </span>
                        )}
                      </div>
                      <div className="ml-auto flex flex-wrap gap-3">
                        {completed.length >= 2 && (
                          <button
                            onClick={() => toggleCompare(v.id)}
                            className={`text-xs rounded-md px-3 py-2 border transition-colors min-h-[44px] ${
                              compareIds?.includes(v.id)
                                ? "border-accent bg-accent text-white"
                                : "border-line hover:border-accent text-ink-dim"
                            }`}
                          >
                            {compareIds?.includes(v.id) ? "✓ Selected" : "Select to compare"}
                          </button>
                        )}
                        <Link
                          to={`/app/jobs/${v.jobId}`}
                          className="text-xs rounded-md px-3 py-2 border border-line hover:border-accent hover:text-accent text-ink-dim transition-colors min-h-[44px] flex items-center"
                        >
                          View report →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
