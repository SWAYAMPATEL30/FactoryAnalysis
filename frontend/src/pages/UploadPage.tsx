import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { TopBar } from "../components/TopBar";
import { analyzeVideo, analyzeSampleVideo } from "../api/client";

export function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [activityDescription, setActivityDescription] = useState("ASSY WITH PRESS OPERATION");
  const [stationNo, setStationNo] = useState("");
  const [activityNo, setActivityNo] = useState("");
  const [fastMode, setFastMode] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => analyzeVideo(file!, { activityDescription, stationNo, activityNo, fastMode }),
    onSuccess: (data) => navigate(`/jobs/${data.job_id}`),
  });

  const sampleMutation = useMutation({
    mutationFn: () => analyzeSampleVideo({ activityDescription, stationNo, activityNo, fastMode }),
    onSuccess: (data) => navigate(`/jobs/${data.job_id}`),
  });

  function pickFile(f: File | null) {
    setFileError(null);
    if (!f) return;
    
    if (!f.type.startsWith("video/")) {
      setFileError("Please upload a video file (.mp4, .mov, etc)");
      return;
    }
    
    if (f.size > 512 * 1024 * 1024) {
      setFileError("File is too large. Maximum size is 512MB.");
      return;
    }
    
    setFile(f);
  }

  const busy = mutation.isPending || sampleMutation.isPending;

  return (
    <div className="min-h-screen">
      <TopBar />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
          <span className="inline-block h-px w-4 bg-accent" />
          Video in, MOST study out
        </div>
        <h1 className="mb-4 text-balance font-display text-[40px] font-extrabold uppercase leading-[0.98] text-ink">
          Every motion, <span className="text-accent">measured</span> automatically
        </h1>
        <p className="mb-8 max-w-[46ch] text-ink-dim">
          Upload a work cycle. Elemental motions get identified, classified, and timed
          automatically -- synced frame-for-frame with the report they build.
        </p>

        <div className="mb-8 flex items-center gap-3 rounded-md border border-line bg-raised-2 px-4 py-3">
          <div className="flex-1 text-sm text-ink-dim">
            No video handy? Run the pipeline on a real sample cycle.
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => sampleMutation.mutate()}
            className="whitespace-nowrap rounded-md border border-line-strong bg-raised px-3.5 py-2 text-xs font-semibold text-ink hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sampleMutation.isPending ? "Starting…" : "Try the sample cycle"}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-faint">
              Station no.
            </label>
            <input
              type="text"
              value={stationNo}
              onChange={(e) => setStationNo(e.target.value)}
              className="w-full rounded-md border border-line-strong bg-raised px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              placeholder="e.g. ST-04"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-faint">
              Activity no.
            </label>
            <input
              type="text"
              value={activityNo}
              onChange={(e) => setActivityNo(e.target.value)}
              className="w-full rounded-md border border-line-strong bg-raised px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              placeholder="e.g. A-112"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-faint">
              Activity description
            </label>
            <input
              type="text"
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
              className="w-full rounded-md border border-line-strong bg-raised px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              placeholder="e.g. ASSY WITH PRESS OPERATION"
            />
          </div>
        </div>

        {/* Analysis Mode Toggle */}
        <div className="mb-8">
          <label className="mb-3 block text-xs font-medium uppercase tracking-wide text-ink-faint">
            Analysis Mode
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Fast Mode */}
            <button
              type="button"
              onClick={() => setFastMode(true)}
              className={`flex cursor-pointer flex-col items-start gap-1 rounded-md border p-4 text-left transition-colors ${
                fastMode ? "border-accent bg-accent-soft" : "border-line-strong bg-raised hover:border-accent"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span className={`font-semibold ${ fastMode ? "text-accent" : "text-ink" }`}>Fast Mode</span>
                </div>
                <span className="rounded-sm bg-line px-2 py-0.5 font-mono text-[11px] text-ink-dim">~1-2 min</span>
              </div>
              <span className="text-sm text-ink-dim">
                Optimized CV tracking (640p + 2fps + skipped frames). 90% faster. Best for quick estimates.
              </span>
            </button>
            
            {/* Accurate Mode */}
            <button
              type="button"
              onClick={() => setFastMode(false)}
              className={`flex cursor-pointer flex-col items-start gap-1 rounded-md border p-4 text-left transition-colors ${
                !fastMode ? "border-va bg-va-soft/40" : "border-line-strong bg-raised hover:border-va/60"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <span className={`font-semibold ${ !fastMode ? "text-va" : "text-ink" }`}>Accurate Mode</span>
                </div>
                <span className="rounded-sm bg-line px-2 py-0.5 font-mono text-[11px] text-ink-dim">~8-10 min</span>
              </div>
              <span className="text-sm text-ink-dim">
                High-fidelity CV tracking (full res + 4fps + tracks every frame). Best for final audit reports.
              </span>
            </button>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files[0] ?? null);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-md border-2 border-dashed px-8 py-16 text-center transition-all duration-300 relative overflow-hidden group ${
            dragging ? "border-accent bg-accent-soft scale-[1.02]" : fileError ? "border-nva bg-nva-soft hover:border-nva/70" : "border-line-strong bg-raised hover:border-accent hover:bg-raised-2"
          }`}
        >
          {/* Animated Idle Factory Illustration */}
          {!file && (
            <div className="absolute inset-0 pointer-events-none opacity-5 group-hover:opacity-10 transition-opacity duration-700 flex items-center justify-center -z-10">
              <svg viewBox="0 0 100 100" className="w-64 h-64 text-ink">
                {/* Building Base */}
                <path d="M10 90h80v-40h-80z" fill="currentColor" />
                {/* Roof sections */}
                <path d="M10 50l15-20v20h-15z" fill="currentColor" />
                <path d="M30 50l15-20v20h-15z" fill="currentColor" />
                <path d="M50 50l15-20v20h-15z" fill="currentColor" />
                <path d="M70 50l15-20v20h-15z" fill="currentColor" />
                {/* Animated smoke */}
                <circle cx="20" cy="20" r="4" fill="currentColor" className="animate-[ping_3s_infinite_ease-out]" />
                <circle cx="40" cy="15" r="5" fill="currentColor" className="animate-[ping_4s_infinite_ease-out]" style={{ animationDelay: '1s' }} />
                <circle cx="60" cy="22" r="3" fill="currentColor" className="animate-[ping_3.5s_infinite_ease-out]" style={{ animationDelay: '0.5s' }} />
              </svg>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <svg
            viewBox="0 0 40 40"
            fill="none"
            className="mx-auto mb-3.5 h-10 w-10"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="32" height="32" rx="3" stroke="var(--color-ink-faint)" strokeWidth="1.5" />
            <path
              d="M20 26V14M20 14l-5 5M20 14l5 5"
              stroke="var(--color-accent)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {file ? (
            <div className="font-display text-2xl font-semibold text-ink text-balance">{file.name}</div>
          ) : (
            <>
              <div className="mb-2 font-display text-xl font-semibold text-ink">Drop a work-cycle video, or click to browse</div>
              <div className="text-sm text-ink-faint">
                MP4 or AVI format supported. Up to 512MB.
              </div>
            </>
          )}
          {fileError && (
            <div className="mt-4 inline-block rounded-sm bg-nva-soft px-3 py-1 font-mono text-xs font-semibold text-nva">
              {fileError}
            </div>
          )}
        </div>

        {(mutation.isError || sampleMutation.isError) && (
          <div className="mt-4 rounded-md border border-nva bg-nva-soft px-4 py-3 text-sm text-nva">
            {((mutation.error ?? sampleMutation.error) as Error).message}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={!file || busy}
            onClick={() => mutation.mutate()}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mutation.isPending ? "Starting analysis…" : "Run analysis"}
          </button>
        </div>
      </div>
    </div>
  );
}
