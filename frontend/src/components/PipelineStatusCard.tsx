/**
 * PipelineStatusCard — shown for any study in PROCESSING status.
 *
 * Polls /api/v1/jobs/:jobId every 3s, maps the backend `phase` field to a
 * 6-stage visual stepper, and emits onComplete(jobStatus) when the job
 * reaches COMPLETED or FAILED so the parent can refresh the VideoEntry.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getJobStatus } from "../api/client";
import type { JobStatusResponse } from "../api/types";

// 6 stages map from backend phase → friendly label
const STAGES: { phase: string; label: string; estimatedSec: number }[] = [
  { phase: "QUEUED",       label: "Uploaded",          estimatedSec: 2   },
  { phase: "PREPROCESSING",label: "Preprocessing",    estimatedSec: 5   },
  { phase: "CV_TRACKING",  label: "Tracking motion",   estimatedSec: 60  },
  { phase: "UPLOADING",    label: "Sending to AI",     estimatedSec: 20  },
  { phase: "SEGMENTING",   label: "AI analysis",       estimatedSec: 60  },
  { phase: "CLASSIFYING",  label: "Classifying MOST",  estimatedSec: 30  },
  { phase: "FINALIZING",   label: "Generating report", estimatedSec: 15  },
];

const TERMINAL = new Set(["COMPLETED", "FAILED"]);

function getStageIndex(phase: string): number {
  const idx = STAGES.findIndex((s) => s.phase === phase);
  return idx === -1 ? 0 : idx;
}

function estimateRemaining(phase: string): string {
  const idx = getStageIndex(phase);
  const remainSec = STAGES.slice(idx + 1).reduce((s, st) => s + st.estimatedSec, 0);
  if (remainSec <= 0) return "Almost done…";
  const m = Math.floor(remainSec / 60);
  const s = remainSec % 60;
  if (m === 0) return `~${s}s remaining`;
  return `~${m}m ${s > 0 ? s + "s" : ""} remaining`;
}

interface Props {
  jobId: string;
  onComplete?: (data: JobStatusResponse) => void;
}

export function PipelineStatusCard({ jobId, onComplete }: Props) {
  const { data } = useQuery({
    queryKey: ["status", jobId],
    queryFn: () => getJobStatus(jobId),
    enabled: !!jobId,
    refetchInterval: (query) =>
      query.state.data && TERMINAL.has(query.state.data.status) ? false : 3000,
    refetchIntervalInBackground: true,
  });

  const phase = data?.phase ?? "QUEUED";
  const status = data?.status ?? "PROCESSING";
  const activeIdx = getStageIndex(phase);
  const isFailed = status === "FAILED";
  const isDone = status === "COMPLETED";

  useEffect(() => {
    if ((isDone || isFailed) && data && onComplete) {
      onComplete(data);
    }
  }, [isDone, isFailed, data, onComplete]);

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      {/* Stage stepper */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
        {STAGES.map((stage, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx && !isDone && !isFailed;
          return (
            <div key={stage.phase} className="flex items-center gap-1 shrink-0">
              {/* Circle */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                  isDone
                    ? "bg-green-500 text-white"
                    : isFailed && i === activeIdx
                    ? "bg-red-500 text-white"
                    : done
                    ? "bg-accent text-white"
                    : active
                    ? "bg-amber-500 text-white"
                    : "bg-white border border-line-strong text-ink-faint"
                }`}
              >
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                ) : done ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1,5 4,8 9,2" />
                  </svg>
                ) : active ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              {/* Label */}
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  active ? "text-amber-700" : done || isDone ? "text-accent" : "text-ink-faint"
                }`}
              >
                {stage.label}
              </span>
              {/* Connector */}
              {i < STAGES.length - 1 && (
                <div
                  className={`h-px w-3 shrink-0 ${
                    done || isDone ? "bg-accent" : "bg-line-strong"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      {!isDone && !isFailed && (
        <div className="h-1.5 w-full rounded-full bg-amber-200 overflow-hidden mb-2">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(4, (activeIdx / (STAGES.length - 1)) * 100)}%` }}
          />
        </div>
      )}

      {/* Status row */}
      <div className="flex items-center justify-between">
        {isDone ? (
          <span className="text-xs font-semibold text-green-700">✓ Analysis complete</span>
        ) : isFailed ? (
          <span className="text-xs font-semibold text-red-600">✕ Analysis failed</span>
        ) : (
          <>
            <span className="text-xs text-amber-700 font-medium">
              {STAGES[activeIdx]?.label ?? "Processing"}…
            </span>
            <span className="text-xs text-amber-600">{estimateRemaining(phase)}</span>
          </>
        )}
      </div>
    </div>
  );
}
