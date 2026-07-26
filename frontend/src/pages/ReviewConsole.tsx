import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../components/TopBar";
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
import { useJobStream } from "../hooks/useJobStream";
import { useToast } from "../components/ToastProvider";
import type { TaxonomyBucket } from "../api/types";
import { getJobStatus, getJobRows, getJobFlags, excelDownloadUrl, videoUrl } from "../api/client";

const TERMINAL = new Set(["COMPLETED", "FAILED"]);

export function ReviewConsole() {
  const { jobId } = useParams<{ jobId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  const statusQuery = useQuery({
    queryKey: ["status", jobId],
    queryFn: () => getJobStatus(jobId!),
    enabled: !!jobId,
    retry: false,
    refetchInterval: (query) => {
      if (query.state.error) return false;
      if (query.state.data && TERMINAL.has(query.state.data.status)) return false;
      return 2000;
    },
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

  if (statusQuery.isError) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-raised-2 text-ink-faint">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mb-2 font-display text-2xl font-bold uppercase text-ink">Job Not Found or Expired</h2>
          <p className="mb-6 text-sm text-ink-dim">
            This analysis job ID is no longer active in server memory (likely because the server was restarted for a code deployment).
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink no-underline"
          >
            Start New Analysis
          </Link>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen">
      <TopBar />
      <div className="mx-auto max-w-6xl px-6 py-8">
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
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink no-underline"
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
              <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="md:col-span-1">
                  <EfficiencyGauge vaSec={sums.VA} totalSec={totalSec} />
                </div>
                <div className="md:col-span-2">
                  <VaNvaDonut sums={sums} />
                </div>
              </div>
            )}
          </>
        )}

        <div className="mb-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
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
    </div>
  );
}
