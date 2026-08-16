import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { JobPhase } from "../api/types";

const PHASES: { key: JobPhase; label: string; icon: ReactNode }[] = [
  {
    key: "PREPROCESSING",
    label: "Blurring Faces",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    )
  },
  {
    key: "CV_TRACKING" as JobPhase,
    label: "AI Vision Tracking",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  },
  {
    key: "UPLOADING",
    label: "AI Time & Motion Analysis",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
      </svg>
    )
  },
  {
    key: "SEGMENTING",
    label: "Elemental Wise Analysis",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
      </svg>
    )
  },
  {
    key: "CLASSIFYING",
    label: "MUDA Analysis",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    key: "FINALIZING",
    label: "AS IS Final Report",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    key: "COMPLETED",
    label: "Potential Recommendations",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  }
];


export function PhaseProgress({ phase }: { phase: string }) {
  if (phase === "FAILED") {
    return (
      <div className="rounded-md border border-nva bg-nva-soft px-4 py-3 text-sm text-nva">
        Analysis failed. Check the backend logs for details.
      </div>
    );
  }

  const activeIndex = PHASES.findIndex((p) => p.key === phase);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        {PHASES.map((p, i) => {
          const done = activeIndex > i || phase === "COMPLETED";
          const active = activeIndex === i && phase !== "COMPLETED";
          
          return (
            <div key={p.key} className="flex flex-col items-center flex-1 relative group">
              {/* Connector line */}
              {i < PHASES.length - 1 && (
                <div className="absolute top-6 left-[50%] w-full h-[2px] -z-10 bg-line-strong overflow-hidden">
                  <motion.div
                    className="h-full bg-accent"
                    initial={{ width: "0%" }}
                    animate={{ width: done ? "100%" : "0%" }}
                    transition={{ duration: 0.5 }}
                  />
                  {active && (
                    <motion.div
                      className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"
                      animate={{ x: ["-100%", "300%"] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  )}
                </div>
              )}
              
              {/* Step Icon */}
              <motion.div
                initial={false}
                animate={{
                  scale: active ? 1.15 : 1,
                  backgroundColor: done || active ? "var(--color-accent)" : "var(--color-raised-2)",
                  borderColor: done || active ? "var(--color-accent)" : "var(--color-line-strong)",
                  color: done || active ? "var(--color-accent-ink)" : "var(--color-ink-faint)"
                }}
                className="w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 bg-raised relative shadow-sm"
              >
                {done && p.key !== "COMPLETED" ? (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 text-accent-ink"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </motion.svg>
                ) : (
                  p.icon
                )}
                
                {/* Active glow pulse */}
                {active && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-accent -z-10"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </motion.div>
              
              {/* Step Label */}
              <div className="mt-3 text-center">
                <div
                  className={`font-mono text-[11px] uppercase tracking-wide font-semibold ${
                    done || active ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  {p.label}
                </div>
                <div className={`text-[10px] mt-0.5 ${active ? "text-accent animate-pulse" : "opacity-0"}`}>
                  Running...
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
