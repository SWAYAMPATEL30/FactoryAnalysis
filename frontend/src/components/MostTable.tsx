import type { MostRow } from "../api/types";
import { bucketFor } from "../api/types";

const BUCKET_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  VA: { bg: "var(--color-va-soft)", text: "var(--color-va)", border: "var(--color-va)" },
  SVA: { bg: "var(--color-sva-soft)", text: "var(--color-sva)", border: "var(--color-sva)" },
  "NVA-N": { bg: "var(--color-nvan-soft)", text: "var(--color-nvan)", border: "var(--color-nvan)" },
  NVA: { bg: "var(--color-nva-soft)", text: "var(--color-nva)", border: "var(--color-nva)" },
  Noise: { bg: "var(--color-noise-soft)", text: "var(--color-noise)", border: "var(--color-noise)" },
};

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m < 10 ? "0" : ""}${m}:${sec < 10 ? "0" : ""}${sec}`;
}

interface Props {
  rows: MostRow[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function MostTable({ rows, activeIndex, onSelect }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-line bg-raised p-8 text-center text-sm text-ink-faint">
        No MOST analysis rows available yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-raised shadow-sm">
      <div className="flex items-center justify-between border-b border-line bg-raised-2 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            MOST Analysis Worksheet
          </span>
          <span className="rounded bg-line px-2 py-0.5 font-mono text-[11px] text-ink-dim">
            {rows.length} rows
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-sans text-xs">
          <thead>
            <tr className="border-b border-line bg-raised-2/50 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              <th className="px-3.5 py-3 text-center">#</th>
              <th className="px-3.5 py-3 text-center">Card</th>
              <th className="px-4 py-3">Elemental Motion Description</th>
              <th className="px-3.5 py-3 text-center">Video Timeline</th>
              <th className="px-3.5 py-3 text-right">Video Sec</th>
              <th className="px-3.5 py-3 text-right">MOST Sec</th>
              <th className="px-3.5 py-3 text-right">TMU</th>
              <th className="px-3.5 py-3 text-center">Category</th>
              <th className="px-3.5 py-3 text-center">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rows.map((row, i) => {
              const bucket = bucketFor(row);
              const bStyle = BUCKET_STYLE[bucket] ?? BUCKET_STYLE.Noise;
              const isActive = i === activeIndex;
              const videoDuration = row.activity_duration_sec > 0 ? row.activity_duration_sec : (row.t_end_sec - row.t_start_sec);

              return (
                <tr
                  key={row.s_no}
                  onClick={() => onSelect(i)}
                  className={`cursor-pointer transition-colors hover:bg-raised-2/80 ${
                    isActive ? "bg-accent-soft/80 font-medium" : ""
                  }`}
                >
                  <td className="px-3.5 py-3 text-center font-mono text-ink-dim">{row.s_no}</td>
                  <td className="px-3.5 py-3 text-center">
                    <span className="inline-block rounded border border-line-strong bg-raised px-2 py-0.5 font-mono text-[11px] font-bold text-accent">
                      {row.data_card}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    <div className="font-medium">{row.elemental_description}</div>
                    {row.activity_movement_details && (
                      <div className="mt-0.5 text-[11px] text-ink-faint truncate max-w-md">
                        {row.activity_movement_details}
                      </div>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-center font-mono text-ink-faint whitespace-nowrap">
                    {fmtTime(row.t_start_sec)} – {fmtTime(row.t_end_sec)}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-ink-dim">
                    {videoDuration.toFixed(1)}s
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-ink font-semibold">
                    {(row.tmu * 0.036).toFixed(1)}s
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-ink">
                    {row.tmu.toFixed(0)}
                  </td>
                  <td className="px-3.5 py-3 text-center">
                    <span
                      className="inline-block rounded px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide border"
                      style={{
                        backgroundColor: bStyle.bg,
                        color: bStyle.text,
                        borderColor: bStyle.border,
                      }}
                    >
                      {bucket}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-center font-mono">
                    <span
                      className={`inline-block text-[11px] ${
                        row.confidence >= 0.9
                          ? "text-va font-semibold"
                          : row.confidence >= 0.75
                          ? "text-sva"
                          : "text-nva font-bold animate-pulse"
                      }`}
                    >
                      {Math.round(row.confidence * 100)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
