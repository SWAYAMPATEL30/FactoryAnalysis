import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PhaseProgress } from "../components/PhaseProgress";
import { VideoTimeline } from "../components/VideoTimeline";
import { ReportFeed } from "../components/ReportFeed";
import { TotalsPanel } from "../components/TotalsPanel";
import { ReviewFlagPanel } from "../components/ReviewFlagPanel";
import { CompletionBanner } from "../components/CompletionBanner";
import { LiveLogPanel } from "../components/LiveLogPanel";
import { EfficiencyGauge } from "../components/EfficiencyGauge";
import { VaNvaDonut } from "../components/VaNvaDonut";
import { MostTable } from "../components/MostTable";
import { ParetoChart } from "../components/charts/ParetoChart";
import { useJobStream } from "../hooks/useJobStream";
import { useToast } from "../components/ToastProvider";
import type { TaxonomyBucket } from "../api/types";
import { getJobStatus, getJobRows, getJobFlags, excelDownloadUrl, videoUrl } from "../api/client";


const TERMINAL = new Set(["COMPLETED", "FAILED"]);

export function ReviewConsole() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  const statusQuery = useQuery({
    queryKey: ["status", jobId],
    queryFn: () => getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data && TERMINAL.has(query.state.data.status) ? false : 2000),
    // A multi-minute analysis shouldn't freeze its status just because the
    // engineer switched tabs -- keep polling while backgrounded.
    refetchIntervalInBackground: true,
  });

  const isDone = statusQuery.data?.status === "COMPLETED";
  const isFailed = statusQuery.data?.status === "FAILED";
  const { events } = useJobStream(jobId, isDone || isFailed);

  // Trigger toasts on completion (only fire once)
  useEffect(() => {
    if (isDone) toast("Analysis complete", "Your MOST report is ready.", "success");
    if (isFailed) toast("Analysis failed", "There was an error processing the video.", "error");
  }, [isDone, isFailed, toast]);

  const rowsQuery = useQuery({
    queryKey: ["rows", jobId],
    queryFn: () => getJobRows(jobId!),
    enabled: !!jobId,
    refetchInterval: isDone ? false : 2000,
    refetchIntervalInBackground: true,
  });

  const flagsQuery = useQuery({
    queryKey: ["flags", jobId],
    queryFn: () => getJobFlags(jobId!),
    enabled: !!jobId && isDone,
  });

  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
    };
  }, [jobId]);

  const activeIndex = useMemo(() => {
    return rows.findIndex((r) => currentTime >= r.t_start_sec && currentTime < r.t_end_sec);
  }, [rows, currentTime]);

  function seek(time: number) {
    if (videoRef.current) videoRef.current.currentTime = time;
  }

  if (!jobId) return null;

  const phase = statusQuery.data?.phase ?? "QUEUED";
  const generating = !isDone;
  const stationNo = rows[0]?.station_no;
  const activityNo = rows[0]?.activity_no;

  // Compute sums for the dashboard charts
  const sums: Record<TaxonomyBucket, number> = {
    VA: 0,
    SVA: 0,
    "NVA-N": 0,
    NVA: 0,
    Noise: 0,
  };
  let totalSec = 0;
  for (const r of rows) {
    sums.VA += r.va_sec;
    sums.SVA += r.sva_sec;
    sums["NVA-N"] += r.nvan_sec;
    sums.NVA += r.nva_sec;
    totalSec += r.total_time_sec;
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-xs text-ink-faint">
          <button onClick={() => navigate(-1)} className="hover:text-accent transition-colors min-h-[44px] pr-2">← Back</button>
          <span>/</span>
          <span>Report</span>
          {jobId && <span>· <span className="font-mono">{jobId.slice(0, 8)}…</span></span>}
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-display text-2xl font-extrabold uppercase text-ink">Review</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-ink-faint">
              <span>job {jobId}</span>
              {stationNo && <span>· station {stationNo}</span>}
              {activityNo && <span>· activity {activityNo}</span>}
            </div>
          </div>
          {isDone && (
            <a
              href={excelDownloadUrl(jobId)}
              download={`MOST_Analysis_${jobId.slice(0, 8)}.xlsx`}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink no-underline min-h-[44px]"
            >
              Download workbook (.xlsx)
            </a>
          )}
        </div>

        {!isDone && (
          <div className="mb-8">
            <div className="rounded-md border border-line bg-raised p-5">
              <PhaseProgress phase={phase} />
            </div>
            <LiveLogPanel events={events} />
          </div>
        )}

        {isDone && statusQuery.data?.elapsed_sec != null && statusQuery.data?.estimated_manual_sec != null && (
          <>
            <CompletionBanner
              elapsedSec={statusQuery.data.elapsed_sec}
              estimatedManualSec={statusQuery.data.estimated_manual_sec}
              rowCount={rows.length}
            />
            
            {rows.length > 0 && (
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EfficiencyGauge vaSec={sums.VA} totalSec={totalSec} />
                <VaNvaDonut sums={sums} />
              </div>
            )}

            {rows.length > 0 && (
              <div className="mb-6 rounded-xl border border-line bg-raised p-4 sm:p-6">
                <h2 className="font-semibold text-ink mb-1 text-sm">
                  Activity Pareto — Time Distribution
                </h2>
                <p className="text-xs text-ink-faint mb-4">
                  Sorted by time consumed (descending). 1 TMU = 0.036 sec.
                </p>
                <ParetoChart rows={rows} height={280} />
              </div>
            )}

          </>
        )}

        <div className="mb-6 grid grid-cols-1 items-start gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <VideoTimeline
              videoSrc={videoUrl(jobId)}
              videoRef={videoRef}
              rows={rows}
              activeIndex={activeIndex}
              currentTime={currentTime}
              duration={duration}
              onSeek={seek}
            />
            {rows.length > 0 && <TotalsPanel rows={rows} />}
          </div>
          <ReportFeed
            rows={rows}
            activeIndex={activeIndex}
            onSelect={(i) => seek(rows[i].t_start_sec)}
            generating={generating}
            autoFollow={isPlaying}
          />
        </div>

        {rows.length > 0 && (
          <div className="mb-8">
            <MostTable
              rows={rows}
              activeIndex={activeIndex}
              onSelect={(i) => seek(rows[i].t_start_sec)}
            />
          </div>
        )}

        {isDone && flagsQuery.data && <ReviewFlagPanel jobId={jobId} flags={flagsQuery.data} />}
    </div>
  );
}
