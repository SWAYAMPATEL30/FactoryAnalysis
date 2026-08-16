import { useState } from "react";
import { motion } from "framer-motion";
import type { TaxonomyBucket } from "../api/types";

interface Props {
  sums: Record<TaxonomyBucket, number>;
}

const ORDER: TaxonomyBucket[] = ["VA", "SVA", "NVA-N", "NVA", "Noise"];
const COLOR: Record<TaxonomyBucket, string> = {
  VA: "var(--color-va)",
  SVA: "var(--color-sva)",
  "NVA-N": "var(--color-nvan)",
  NVA: "var(--color-nva)",
  Noise: "var(--color-noise)",
};

const LABEL: Record<TaxonomyBucket, string> = {
  VA: "Value Add",
  SVA: "Semi-Value Add",
  "NVA-N": "Non-Value Add (Nec)",
  NVA: "Non-Value Add",
  Noise: "Noise/Idle",
};

export function VaNvaDonut({ sums }: Props) {
  const [hovered, setHovered] = useState<TaxonomyBucket | null>(null);
  
  const grand = ORDER.reduce((acc, k) => acc + sums[k], 0);
  
  // SVG donut math
  const radius = 15.91549430918954; // circumference = 100
  let currentOffset = 0;
  
  const segments = ORDER.map(key => {
    const val = sums[key];
    const pct = grand > 0 ? (val / grand) * 100 : 0;
    const offset = currentOffset;
    currentOffset += pct;
    return { key, pct, offset, val };
  });

  return (
    <div className="flex flex-col rounded-md border border-line bg-raised p-6 h-full relative">
      <div className="text-sm font-semibold text-ink-dim mb-4">Time Distribution</div>
      
      <div className="flex items-center gap-8 flex-1">
        <div className="relative w-36 h-36 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            {segments.map(({ key, pct, offset }) => {
              if (pct === 0) return null;
              const isHovered = hovered === key;
              const isFaded = hovered !== null && !isHovered;
              
              return (
                <motion.circle
                  key={key}
                  cx="18"
                  cy="18"
                  r={radius}
                  fill="transparent"
                  stroke={COLOR[key]}
                  strokeWidth={isHovered ? "6" : "4"}
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeDashoffset={-offset}
                  className="transition-all duration-300 cursor-pointer"
                  style={{ opacity: isFaded ? 0.3 : 1 }}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isFaded ? 0.3 : 1 }}
                />
              );
            })}
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {hovered ? (
              <>
                <div className="text-xl font-mono text-ink">{sums[hovered].toFixed(1)}s</div>
                <div className="text-[10px] font-mono text-ink-faint uppercase">{hovered}</div>
              </>
            ) : (
              <>
                <div className="text-xl font-mono text-ink">{grand.toFixed(1)}s</div>
                <div className="text-[10px] font-mono text-ink-faint uppercase">Total</div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col gap-2.5">
          {/* Always show VA, SVA, NVA-N, NVA — even if zero */}
          {(["VA", "SVA", "NVA-N", "NVA"] as TaxonomyBucket[]).map((key) => {
            const seg = segments.find(s => s.key === key)!;
            const { pct, val } = seg || { pct: 0, val: 0 };
            const isHovered = hovered === key;
            const isFaded = hovered !== null && !isHovered;

            return (
              <div
                key={key}
                className={`flex items-center justify-between text-sm transition-opacity duration-300 ${isFaded ? "opacity-30" : "opacity-100"}`}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-center gap-2 cursor-default">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLOR[key] }} />
                  <span className={`truncate ${isHovered ? "text-ink" : "text-ink-dim"}`}>{LABEL[key]}</span>
                </div>
                <div className="font-mono text-ink text-xs">{val > 0 ? `${Math.round(pct)}%` : "—"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
