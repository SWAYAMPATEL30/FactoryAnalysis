import { useState } from "react";
import type { MostRow } from "../../api/types";

const TMU_TO_SEC = 0.036;

interface ParetoChartProps {
  rows: MostRow[];
  height?: number;
}

interface ParetoBar {
  label: string;
  fullDesc: string;
  sNo: number;
  sec: number;
  tmu: number;
  cumPct: number;
  ownPct: number;
  isTop: boolean;
}

function formatChartLabel(rawDesc: string, sNo: number): string {
  if (!rawDesc) return `#${sNo} Activity`;

  // Strip boilerplate lead phrases
  let clean = rawDesc
    .replace(/^An operator /i, "")
    .replace(/^reaching with right hand toward /i, "Reach ")
    .replace(/^reaching with left hand toward /i, "Reach ")
    .replace(/^grasping the /i, "Grasp ")
    .replace(/^grasping /i, "Grasp ")
    .replace(/^positioning the /i, "Place ")
    .replace(/^positioning /i, "Place ")
    .replace(/^lifting and moving the /i, "Move ")
    .replace(/^fastening /i, "Fasten ")
    .replace(/^setting aside /i, "Set Aside ")
    .trim();

  // Capitalize first letter
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);

  if (clean.length > 15) {
    clean = clean.slice(0, 14) + "…";
  }

  return `#${sNo} ${clean}`;
}

export function ParetoChart({ rows, height = 300 }: ParetoChartProps) {
  const [hoveredBar, setHoveredBar] = useState<ParetoBar | null>(null);

  if (!rows.length) return null;

  // Build sorted pareto data
  const totalSec = rows.reduce((acc, r) => acc + r.tmu * TMU_TO_SEC, 0);

  const sorted = [...rows]
    .sort((a, b) => b.tmu - a.tmu)
    .slice(0, 12); // cap at 12 bars to avoid overcrowding

  let cumPct = 0;
  const bars: ParetoBar[] = sorted.map((r, i) => {
    const sec = r.tmu * TMU_TO_SEC;
    const ownPct = totalSec > 0 ? (sec / totalSec) * 100 : 0;
    cumPct += ownPct;
    return {
      label: formatChartLabel(r.elemental_description || "", r.s_no),
      fullDesc: r.elemental_description || `Activity ${r.s_no}`,
      sNo: r.s_no,
      sec,
      tmu: r.tmu,
      cumPct: Math.min(cumPct, 100),
      ownPct,
      isTop: i === 0,
    };
  });

  const top = bars[0];
  const maxSec = Math.max(...bars.map((b) => b.sec)) * 1.18;

  // Layout constants
  const W = 620;
  const H = height;
  const PAD = { top: 18, right: 54, bottom: 85, left: 52 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const n = bars.length;
  const barW = (plotW / n) * 0.65;
  const barGap = plotW / n;

  const xOf = (i: number) => PAD.left + i * barGap + barGap / 2;
  const yBar = (sec: number) =>
    PAD.top + plotH - (sec / maxSec) * plotH;
  const yPct = (pct: number) =>
    PAD.top + plotH - (pct / 100) * plotH;

  // Y grid (left axis — seconds)
  const secTicks = 4;
  const secTickValues = Array.from({ length: secTicks + 1 }, (_, i) =>
    (maxSec * i) / secTicks
  );

  // % line points
  const linePoints = bars
    .map((b, i) => `${xOf(i)},${yPct(b.cumPct)}`)
    .join(" ");

  return (
    <div className="relative flex flex-col gap-3">
      {/* Floating interactive tooltip card on hover */}
      {hoveredBar && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none rounded-xl border border-purple-500/40 bg-slate-900/95 text-white p-3.5 shadow-2xl max-w-md text-xs backdrop-blur-md transition-all animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between font-bold text-amber-400 mb-1 gap-4">
            <span className="truncate">
              #{hoveredBar.sNo} — {hoveredBar.isTop ? "🔥 Longest Bottleneck" : "Activity Detail"}
            </span>
            <span className="font-mono text-purple-300 shrink-0">
              {hoveredBar.sec.toFixed(2)}s ({hoveredBar.tmu.toFixed(0)} TMU)
            </span>
          </div>
          <div className="text-slate-100 font-medium leading-relaxed mb-2 text-[12px]">
            "{hoveredBar.fullDesc}"
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-700/80 pt-1.5 font-mono">
            <span>Cycle Share: <strong className="text-purple-300">{hoveredBar.ownPct.toFixed(1)}%</strong></span>
            <span>Cumulative: <strong className="text-emerald-400">{hoveredBar.cumPct.toFixed(1)}%</strong></span>
          </div>
        </div>
      )}

      {/* Callout banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
        <span className="font-semibold text-amber-800">⚑ Longest activity: </span>
        <span className="text-amber-700">
          #{top.sNo} {top.fullDesc} — {top.sec.toFixed(1)}s ({top.ownPct.toFixed(0)}% of cycle time)
        </span>
        <span className="ml-2 text-xs text-amber-600 font-mono">
          · {top.tmu.toFixed(0)} TMU
        </span>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        aria-label="Pareto chart — time by activity"
      >
        {/* Left Y axis label (seconds) */}
        <text
          x={14}
          y={PAD.top + plotH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}
          className="fill-[var(--color-ink-faint)]"
          fontSize="9"
        >
          Time (sec)
        </text>

        {/* Right Y axis label (%) */}
        <text
          x={W - 10}
          y={PAD.top + plotH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(90, ${W - 10}, ${PAD.top + plotH / 2})`}
          className="fill-[var(--color-ink-faint)]"
          fontSize="9"
        >
          Cumulative %
        </text>

        {/* Gridlines + left Y tick labels */}
        {secTickValues.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              y1={yBar(v)}
              x2={PAD.left + plotW}
              y2={yBar(v)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 4}
              y={yBar(v)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-[var(--color-ink-faint)] font-mono"
              fontSize="9"
            >
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Right Y axis % labels */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <text
            key={pct}
            x={PAD.left + plotW + 4}
            y={yPct(pct)}
            textAnchor="start"
            dominantBaseline="middle"
            className="fill-[var(--color-ink-faint)] font-mono"
            fontSize="9"
          >
            {pct}%
          </text>
        ))}

        {/* Bars */}
        {bars.map((b, i) => (
          <g
            key={i}
            className="cursor-pointer group"
            onMouseEnter={() => setHoveredBar(b)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <rect
              x={xOf(i) - barW / 2}
              y={yBar(b.sec)}
              width={barW}
              height={plotH - (yBar(b.sec) - PAD.top)}
              fill={b.isTop ? "#c8452c" : "var(--color-accent)"}
              opacity={hoveredBar?.sNo === b.sNo ? 1 : b.isTop ? 0.9 : 0.72}
              rx="3"
              className="transition-all hover:opacity-100"
            />
            {/* Sec label on top of bar */}
            <text
              x={xOf(i)}
              y={yBar(b.sec) - 4}
              textAnchor="middle"
              fontSize="8.5"
              className="fill-[var(--color-ink-dim)] font-mono font-bold"
            >
              {b.sec.toFixed(1)}s
            </text>
          </g>
        ))}

        {/* Cumulative % polyline */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#6a4fc4"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="4 2"
        />
        {bars.map((b, i) => (
          <circle
            key={i}
            cx={xOf(i)}
            cy={yPct(b.cumPct)}
            r={hoveredBar?.sNo === b.sNo ? "6" : "4"}
            fill="#6a4fc4"
            className="transition-all cursor-pointer"
            onMouseEnter={() => setHoveredBar(b)}
            onMouseLeave={() => setHoveredBar(null)}
          />
        ))}

        {/* X axis labels (Rotated at -35 deg to prevent any label collisions) */}
        {bars.map((b, i) => {
          const x = xOf(i);
          const y = PAD.top + plotH + 12;
          const isHovered = hoveredBar?.sNo === b.sNo;
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="end"
              transform={`rotate(-35, ${x}, ${y})`}
              fontSize="8.5"
              className={`font-mono transition-colors cursor-pointer ${
                isHovered
                  ? "fill-accent font-bold scale-105"
                  : "fill-[var(--color-ink-dim)] font-medium"
              }`}
              onMouseEnter={() => setHoveredBar(b)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {b.label}
            </text>
          );
        })}

        {/* X axis baseline */}
        <line
          x1={PAD.left}
          y1={PAD.top + plotH}
          x2={PAD.left + plotW}
          y2={PAD.top + plotH}
          stroke="var(--color-line)"
          strokeWidth="1"
        />

        {/* Legend */}
        <g transform={`translate(${PAD.left}, ${H - 10})`}>
          <rect x="0" y="-8" width="12" height="8" fill="#c8452c" rx="1" />
          <text x="16" y="-1" fontSize="8" className="fill-[var(--color-ink-dim)] font-medium">
            Top activity
          </text>
          <rect x="90" y="-8" width="12" height="8" fill="var(--color-accent)" opacity="0.72" rx="1" />
          <text x="106" y="-1" fontSize="8" className="fill-[var(--color-ink-dim)] font-medium">
            Other activities (sec)
          </text>
          <line x1="240" y1="-4" x2="256" y2="-4" stroke="#6a4fc4" strokeWidth="2" strokeDasharray="4 2" />
          <circle cx="248" cy="-4" r="3" fill="#6a4fc4" />
          <text x="260" y="-1" fontSize="8" className="fill-[var(--color-ink-dim)] font-medium">
            Cumulative %
          </text>
        </g>
      </svg>
    </div>
  );
}
