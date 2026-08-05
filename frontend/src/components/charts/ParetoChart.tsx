import type { MostRow } from "../../api/types";

const TMU_TO_SEC = 0.036;

interface ParetoChartProps {
  rows: MostRow[];
  height?: number;
}

interface ParetoBar {
  label: string;
  sec: number;
  tmu: number;
  cumPct: number;
  ownPct: number;
  isTop: boolean;
}

function truncate(s: string, n = 14) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function ParetoChart({ rows, height = 260 }: ParetoChartProps) {
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
      label: truncate(r.elemental_description || `Activity ${r.s_no}`),
      sec,
      tmu: r.tmu,
      cumPct: Math.min(cumPct, 100),
      ownPct,
      isTop: i === 0,
    };
  });

  const top = bars[0];
  const maxSec = Math.max(...bars.map((b) => b.sec)) * 1.15;

  // Layout constants
  const W = 600;
  const H = height;
  const PAD = { top: 16, right: 52, bottom: 56, left: 52 };
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
    <div className="flex flex-col gap-3">
      {/* Callout banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
        <span className="font-semibold text-amber-800">⚑ Longest activity: </span>
        <span className="text-amber-700">
          {top.label.replace("…", "")} — {top.sec.toFixed(1)}s ({top.ownPct.toFixed(0)}% of cycle time)
        </span>
        <span className="ml-2 text-xs text-amber-600">
          · {top.tmu.toFixed(0)} TMU
        </span>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
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
              className="fill-[var(--color-ink-faint)]"
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
            className="fill-[var(--color-ink-faint)]"
            fontSize="9"
          >
            {pct}%
          </text>
        ))}

        {/* Bars */}
        {bars.map((b, i) => (
          <g key={i}>
            <rect
              x={xOf(i) - barW / 2}
              y={yBar(b.sec)}
              width={barW}
              height={plotH - (yBar(b.sec) - PAD.top)}
              fill={b.isTop ? "#c8452c" : "var(--color-accent)"}
              opacity={b.isTop ? 1 : 0.72}
              rx="2"
            >
              <title>
                {b.label} — {b.tmu.toFixed(0)} TMU | {b.sec.toFixed(2)}s | {b.ownPct.toFixed(1)}% of total
              </title>
            </rect>
            {/* Sec label on top of bar */}
            <text
              x={xOf(i)}
              y={yBar(b.sec) - 4}
              textAnchor="middle"
              fontSize="8"
              className="fill-[var(--color-ink-dim)]"
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
            r="4"
            fill="#6a4fc4"
          >
            <title>Cumulative: {b.cumPct.toFixed(1)}%</title>
          </circle>
        ))}

        {/* X axis labels */}
        {bars.map((b, i) => (
          <text
            key={i}
            x={xOf(i)}
            y={PAD.top + plotH + 14}
            textAnchor="middle"
            fontSize="8"
            className="fill-[var(--color-ink-faint)]"
          >
            {b.label}
          </text>
        ))}

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
          <text x="16" y="-1" fontSize="8" className="fill-[var(--color-ink-dim)]">
            Top activity
          </text>
          <rect x="90" y="-8" width="12" height="8" fill="var(--color-accent)" opacity="0.72" rx="1" />
          <text x="106" y="-1" fontSize="8" className="fill-[var(--color-ink-dim)]">
            Other activities (sec)
          </text>
          <line x1="240" y1="-4" x2="256" y2="-4" stroke="#6a4fc4" strokeWidth="2" strokeDasharray="4 2" />
          <circle cx="248" cy="-4" r="3" fill="#6a4fc4" />
          <text x="260" y="-1" fontSize="8" className="fill-[var(--color-ink-dim)]">
            Cumulative %
          </text>
        </g>
      </svg>
    </div>
  );
}
