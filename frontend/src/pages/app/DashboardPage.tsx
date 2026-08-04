import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useWorkstations } from "../../context/WorkstationContext";
import { getTrend, tmuToCycleTime } from "../../types/models";
import type { Trend, Workstation, VideoEntry } from "../../types/models";
import { CycleTimeTrendChart } from "../../components/charts/CycleTimeTrendChart";
import { MotionBreakdownChart } from "../../components/charts/MotionBreakdownChart";

const TREND_CONFIG: Record<Trend, { label: string; dot: string; border: string; bg: string }> = {
  improving:  { label: "↓ Improving",  dot: "bg-green-500", border: "border-green-200", bg: "bg-green-50" },
  stable:     { label: "→ Stable",     dot: "bg-amber-400", border: "border-amber-200", bg: "bg-amber-50" },
  regressing: { label: "↑ Regressing", dot: "bg-red-500",   border: "border-red-200",  bg: "bg-red-50"  },
  new:        { label: "◌ New",        dot: "bg-blue-400",  border: "border-blue-200", bg: "bg-blue-50" },
};

function StationTile({ ws, videos }: { ws: Workstation; videos: VideoEntry[] }) {
  const trend = getTrend(videos);
  const cfg = TREND_CONFIG[trend];
  const latest = videos.find((v) => v.status === "COMPLETED");
  return (
    <Link
      to={`/app/workstations/${ws.id}`}
      className={`rounded-xl border p-4 sm:p-5 flex flex-col gap-3 hover:shadow-md transition-all cursor-pointer ${cfg.border} ${cfg.bg}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-ink text-sm truncate">{ws.name}</div>
          <div className="text-xs text-ink-faint mt-0.5">{ws.line}</div>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0 ${cfg.bg} border ${cfg.border}`}
        >
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>
      </div>
      {latest && (
        <div className="flex items-center gap-4">
          <div>
            <div className="font-mono font-bold text-xl text-ink">
              {latest.cycletime_tmu?.toLocaleString()}
            </div>
            <div className="text-xs text-ink-faint">
              TMU · {tmuToCycleTime(latest.cycletime_tmu ?? 0)}
            </div>
          </div>
          <div className="text-xs text-ink-faint">
            {videos.length} {videos.length === 1 ? "study" : "studies"}
          </div>
        </div>
      )}
      {videos.length === 0 && (
        <div className="text-xs text-ink-faint">No studies yet</div>
      )}
    </Link>
  );
}

// ── AI Insight block ───────────────────────────────────────────────────────────
interface InsightProps {
  agg: { G: number; C: number; T: number };
  stations: Workstation[];
  companyVideos: VideoEntry[];
  getVideosForWorkstation: (id: string) => VideoEntry[];
}

function buildInsights({ agg, stations, companyVideos, getVideosForWorkstation }: InsightProps): string[] {
  const total = agg.G + agg.C + agg.T;
  if (total === 0) return ["Upload a study to see AI-driven insights here."];

  const gPct = Math.round((agg.G / total) * 100);
  const cPct = Math.round((agg.C / total) * 100);

  const insights: string[] = [];

  // Insight 1: dominant motion type
  if (gPct >= 45) {
    insights.push(
      `General Move accounts for ${gPct}% of cycle time company-wide — review part presentation and bin placement to shorten reach distances.`
    );
  } else if (cPct >= 45) {
    insights.push(
      `Controlled Move dominates at ${cPct}% of cycle time — evaluate fixture and jig design to reduce force-constrained motion.`
    );
  } else {
    insights.push(
      `Motion mix is balanced: ${gPct}% General Move, ${cPct}% Controlled Move. Focus on overall cycle time reduction rather than a single category.`
    );
  }

  // Insight 2: regressing stations
  const regressingStations = stations.filter(
    (ws) => getTrend(getVideosForWorkstation(ws.id)) === "regressing"
  );
  if (regressingStations.length > 0) {
    const names = regressingStations.map((s) => s.name.split("–")[0].trim()).join(", ");
    insights.push(
      `${names} ${regressingStations.length === 1 ? "is" : "are"} trending up in cycle time — inspect operator technique and recent fixture setup changes.`
    );
  } else {
    const completedCount = companyVideos.length;
    insights.push(
      `All ${stations.length} stations are stable or improving across ${completedCount} studies. Keep scheduling regular studies to maintain visibility.`
    );
  }

  // Insight 3: pending flags
  const flaggedStudies = companyVideos.filter((v) => (v.flagCount ?? 0) > 0);
  if (flaggedStudies.length > 0) {
    insights.push(
      `${flaggedStudies.length} ${flaggedStudies.length === 1 ? "study has" : "studies have"} unresolved flags — open each report to review AI confidence warnings before accepting the data.`
    );
  }

  return insights.slice(0, 3);
}

// ── Recent Activity row ────────────────────────────────────────────────────────
function ActivityRow({
  v,
  stationName,
}: {
  v: VideoEntry;
  stationName: string;
}) {
  const [flagsOpen, setFlagsOpen] = useState(false);
  const hasFlags = (v.flagCount ?? 0) > 0;

  return (
    <div className="py-3 border-b border-line last:border-0">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">{stationName}</div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-faint mt-0.5">
            <span>{v.recordedDate}</span>
            <span>·</span>
            <span>{v.rowCount} motions</span>
            {hasFlags ? (
              <button
                onClick={() => setFlagsOpen((p) => !p)}
                className="text-amber-600 font-medium hover:underline min-h-[32px]"
              >
                {v.flagCount} flag{(v.flagCount ?? 0) > 1 ? "s" : ""} {flagsOpen ? "▲" : "▼"}
              </button>
            ) : (
              <span>No flags</span>
            )}
          </div>
          {/* Inline flag expansion */}
          {flagsOpen && hasFlags && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="font-semibold mb-1">⚠ Review flags ({v.flagCount})</div>
              <ul className="list-disc pl-4 flex flex-col gap-1">
                {Array.from({ length: v.flagCount ?? 1 }).map((_, i) => (
                  <li key={i}>
                    AI confidence below threshold on segment {i + 1} — verify the MOST classification
                    manually before accepting this study.
                  </li>
                ))}
              </ul>
              <Link
                to={`/app/jobs/${v.jobId}`}
                className="mt-2 inline-block text-accent hover:underline font-medium"
              >
                Open report to resolve →
              </Link>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-bold text-sm text-ink">
            {v.cycletime_tmu?.toLocaleString()} TMU
          </div>
          <Link
            to={`/app/jobs/${v.jobId}`}
            className="text-xs text-accent hover:underline"
          >
            View report →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard page ─────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { company } = useAuth();
  const { getWorkstationsForCompany, getVideosForWorkstation, videos } = useWorkstations();
  const navigate = useNavigate();

  const stations = company ? getWorkstationsForCompany(company.id) : [];
  const companyVideos = videos.filter(
    (v) => v.companyId === company?.id && v.status === "COMPLETED"
  );

  // Aggregate motion counts across company
  const agg = companyVideos.reduce(
    (acc, v) => ({
      G: acc.G + (v.motion_counts?.G ?? 0),
      C: acc.C + (v.motion_counts?.C ?? 0),
      T: acc.T + (v.motion_counts?.T ?? 0),
    }),
    { G: 0, C: 0, T: 0 }
  );

  // Build chart series (one per station, up to 5)
  const COLORS = ["#0e8f80", "#6a4fc4", "#d4820a", "#1a9a52", "#c8452c"];
  const chartSeries = stations
    .slice(0, 5)
    .map((ws, i) => ({
      name: ws.name.split("–")[0].trim(),
      color: COLORS[i % COLORS.length],
      data: getVideosForWorkstation(ws.id)
        .filter((v) => v.status === "COMPLETED" && v.cycletime_tmu)
        .map((v) => ({ date: v.recordedDate, tmu: v.cycletime_tmu! })),
    }))
    .filter((s) => s.data.length > 0);

  // Recent activity
  const recent = [...companyVideos]
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .slice(0, 5);

  const studiesThisMonth = companyVideos.filter((v) =>
    v.uploadedAt.startsWith("2026-09")
  ).length;

  const insights = buildInsights({ agg, stations, companyVideos, getVideosForWorkstation });

  return (
    <div className="px-4 py-6 sm:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-ink-faint mb-1">
            {company?.name}
          </div>
          <h1 className="font-display font-extrabold text-3xl uppercase text-ink">Dashboard</h1>
        </div>
        <button
          onClick={() => navigate("/app/workstations")}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors min-h-[44px]"
        >
          + New study
        </button>
      </div>

      {/* KPI strip — 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { label: "Workstations", value: stations.length.toString() },
          { label: "Studies this month", value: studiesThisMonth.toString() },
          { label: "Total studies", value: companyVideos.length.toString() },
          {
            label: "Pending review",
            value: companyVideos.filter((v) => (v.flagCount ?? 0) > 0).length.toString(),
          },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-line bg-raised p-4 sm:p-5">
            <div className="font-display font-extrabold text-3xl text-ink">{kpi.value}</div>
            <div className="text-xs text-ink-faint mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Main chart grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Trend chart — 2/3 width on XL */}
        <div className="xl:col-span-2 rounded-xl border border-line bg-raised p-4 sm:p-6">
          <h2 className="font-semibold text-ink mb-1 text-sm">Cycle Time Trend</h2>
          <p className="text-xs text-ink-faint mb-4">
            TMU per station across all dated studies
          </p>
          {chartSeries.length > 0 ? (
            <CycleTimeTrendChart series={chartSeries} height={220} />
          ) : (
            <div className="h-40 flex items-center justify-center text-ink-faint text-sm">
              Upload a study to see the trend
            </div>
          )}
        </div>

        {/* Motion breakdown — 1/3 width */}
        <div className="rounded-xl border border-line bg-raised p-4 sm:p-6">
          <h2 className="font-semibold text-ink mb-1 text-sm">Motion Breakdown</h2>
          <p className="text-xs text-ink-faint mb-4">
            Company-wide across all completed studies
          </p>
          <MotionBreakdownChart G={agg.G} C={agg.C} T={agg.T} />

          {/* Expanded 3-sentence AI insight */}
          <div className="mt-5 p-3 rounded-lg bg-raised-2 text-xs text-ink-dim leading-relaxed flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <svg className="w-3 h-3 text-accent shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 010 1.5A.75.75 0 018 4zm.75 7.75h-1.5V7h1.5v4.75z" />
              </svg>
              <span className="font-semibold text-ink text-[11px] uppercase tracking-wide">
                AI Insights
              </span>
            </div>
            {insights.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Workstation grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl uppercase text-ink">Factory Floor</h2>
          <Link to="/app/workstations" className="text-xs text-accent hover:underline">
            All workstations →
          </Link>
        </div>
        {stations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-12 text-center text-ink-faint">
            <p className="mb-4">No workstations yet.</p>
            <Link to="/app/workstations" className="text-accent text-sm hover:underline">
              Create your first workstation →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {stations.map((ws) => (
              <StationTile
                key={ws.id}
                ws={ws}
                videos={getVideosForWorkstation(ws.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-line bg-raised p-4 sm:p-6">
        <h2 className="font-semibold text-ink mb-1 text-sm">Recent Activity</h2>
        {recent.length === 0 ? (
          <div className="text-sm text-ink-faint mt-3">No completed studies yet.</div>
        ) : (
          <div className="flex flex-col">
            {recent.map((v) => {
              const ws = stations.find((w) => w.id === v.workstationId);
              return (
                <ActivityRow
                  key={v.id}
                  v={v}
                  stationName={ws?.name ?? "Unknown station"}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
