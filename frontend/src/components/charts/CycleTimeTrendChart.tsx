interface DataPoint {
  date: string;  // ISO date
  tmu: number;
  label?: string;
}

interface Series {
  name: string;
  color: string;
  data: DataPoint[];
}

interface CycleTimeTrendChartProps {
  series: Series[];
  height?: number;
}

export function CycleTimeTrendChart({ series, height = 200 }: CycleTimeTrendChartProps) {
  const W = 600;
  const H = height;
  const PAD = { top: 16, right: 24, bottom: 36, left: 56 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Flatten all values for scale
  const allTmu = series.flatMap((s) => s.data.map((d) => d.tmu));
  const allDates = series.flatMap((s) => s.data.map((d) => d.date)).sort();
  if (allTmu.length === 0) return <div className="h-32 flex items-center justify-center text-ink-faint text-sm">No data</div>;

  const minTmu = Math.min(...allTmu) * 0.9;
  const maxTmu = Math.max(...allTmu) * 1.05;
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];

  const toX = (date: string) => {
    const ratio =
      allDates.length < 2
        ? 0.5
        : (new Date(date).getTime() - new Date(minDate).getTime()) /
          (new Date(maxDate).getTime() - new Date(minDate).getTime());
    return PAD.left + ratio * plotW;
  };

  const toY = (tmu: number) =>
    PAD.top + plotH - ((tmu - minTmu) / (maxTmu - minTmu)) * plotH;

  // Y grid lines
  const yTicks = 4;
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => minTmu + ((maxTmu - minTmu) * i) / yTicks);

  // Unique sorted dates for x axis labels
  const xLabels = [...new Set(allDates)].slice(0, 5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Cycle time trend chart">
      {/* Grid lines */}
      {yLines.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left} y1={toY(v)}
            x2={PAD.left + plotW} y2={toY(v)}
            stroke="var(--color-line)" strokeWidth="1"
          />
          <text x={PAD.left - 6} y={toY(v)} textAnchor="end" dominantBaseline="middle"
            className="fill-[var(--color-ink-faint)]" fontSize="10">
            {Math.round(v)}
          </text>
        </g>
      ))}

      {/* X axis labels */}
      {xLabels.map((d) => (
        <text key={d} x={toX(d)} y={H - 6} textAnchor="middle"
          className="fill-[var(--color-ink-faint)]" fontSize="9">
          {new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
        </text>
      ))}

      {/* Series lines + dots */}
      {series.map((s) => {
        const pts = s.data.sort((a, b) => a.date.localeCompare(b.date));
        const polyline = pts.map((d) => `${toX(d.date)},${toY(d.tmu)}`).join(" ");
        return (
          <g key={s.name}>
            <polyline
              points={polyline}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {pts.map((d, i) => (
              <g key={i}>
                <circle cx={toX(d.date)} cy={toY(d.tmu)} r="5" fill={s.color} />
                <circle cx={toX(d.date)} cy={toY(d.tmu)} r="3" fill="white" />
              </g>
            ))}
          </g>
        );
      })}

      {/* Legend */}
      {series.map((s, i) => (
        <g key={s.name} transform={`translate(${PAD.left + i * 140}, ${H - 4})`}>
          <line x1="0" y1="-10" x2="14" y2="-10" stroke={s.color} strokeWidth="2.5" />
          <circle cx="7" cy="-10" r="3" fill={s.color} />
          <text x="18" y="-6" className="fill-[var(--color-ink-dim)]" fontSize="9">{s.name}</text>
        </g>
      ))}
    </svg>
  );
}
