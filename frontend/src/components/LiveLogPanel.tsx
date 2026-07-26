import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StreamEvent } from "../hooks/useJobStream";

interface Props {
  events: StreamEvent[];
}

export function LiveLogPanel({ events }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, isOpen]);

  if (events.length === 0) return null;

  return (
    <div className="mt-6 rounded-md border border-line bg-raised overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-raised-2 hover:bg-line/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-ink-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-semibold text-ink-dim">Live Execution Logs</span>
        </div>
        <svg
          className={`w-4 h-4 text-ink-faint transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-line"
          >
            <div className="p-4 bg-[#0a0d12] max-h-64 overflow-y-auto font-mono text-xs leading-relaxed text-[#a3b1c6]">
              {events.map((ev, i) => {
                const time = new Date(ev.ts * 1000).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
                
                let colorClass = "text-[#a3b1c6]";
                if (ev.status === "error") colorClass = "text-nva";
                else if (ev.status === "done") colorClass = "text-va";
                else if (ev.status === "running") colorClass = "text-sva";

                return (
                  <div key={i} className="mb-1 flex gap-3 hover:bg-white/5 px-1 rounded-sm">
                    <span className="text-[#4b596a] shrink-0">[{time}]</span>
                    <span className={`shrink-0 w-24 ${colorClass}`}>[{ev.stage}]</span>
                    <span className="text-white/80">{ev.detail}</span>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
