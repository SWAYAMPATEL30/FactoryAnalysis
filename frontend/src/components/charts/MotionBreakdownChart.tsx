interface MotionBreakdownChartProps {
  G: number;  // General Move count
  C: number;  // Controlled Move count
  T: number;  // Tool Use count
  size?: number;
}

const COLORS = { G: "#0e8f80", C: "#6a4fc4", T: "#d4820a" };
const LABELS = { G: "General Move", C: "Controlled Move", T: "Tool Use" };

export function MotionBreakdownChart({ G, C, T, size = 160 }: MotionBreakdownChartProps) {
  const total = G + C + T;
  if (total === 0) return <div className="text-sm text-ink-faint">No data</div>;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const gap = 0.03; // radians gap between segments

  function describeArc(startAngle: number, endAngle: number, radius: number) {
    const start = {
      x: cx + radius * Math.cos(startAngle),
      y: cy + radius * Math.sin(startAngle),
    };
    const end = {
      x: cx + radius * Math.cos(endAngle),
      y: cy + radius * Math.sin(endAngle),
    };
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  }

  const slices = (
    [["G", G], ["C", C], ["T", T]] as [keyof typeof COLORS, number][]
  ).filter(([, v]) => v > 0);

  let currentAngle = -Math.PI / 2;
  const segments = slices.map(([key, value]) => {
    const sweep = (value / total) * (2 * Math.PI) - gap;
    const path = describeArc(currentAngle, currentAngle + sweep, r);
    const midAngle = currentAngle + sweep / 2;
    currentAngle += sweep + gap;
    return { key, value, path, midAngle, color: COLORS[key] };
  });

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Motion type breakdown">
        {segments.map((seg) => (
          <path key={seg.key} d={seg.path} fill={seg.color} opacity="0.85" />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--color-raised)" />
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="13" fontWeight="bold"
          className="fill-[var(--color-ink)]">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8"
          className="fill-[var(--color-ink-faint)]">MOTIONS</text>
      </svg>
      <div className="flex flex-col gap-2">
        {(["G", "C", "T"] as const).map((key) => {
          const val = { G, C, T }[key];
          const pct = total ? Math.round((val / total) * 100) : 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORS[key] }} />
              <span className="text-xs text-ink-dim">{LABELS[key]}</span>
              <span className="font-mono text-xs font-bold text-ink ml-1">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
