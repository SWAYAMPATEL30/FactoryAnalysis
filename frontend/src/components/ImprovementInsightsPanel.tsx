import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ImprovementInsights, EquipmentUpgradeSuggestion } from "../api/types";
import { getJobInsights, generateJobInsights } from "../api/client";

interface Props {
  jobId: string;
}

export function ImprovementInsightsPanel({ jobId }: Props) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"before_after" | "side_by_side">("before_after");
  const [selectedUpgrade, setSelectedUpgrade] = useState<EquipmentUpgradeSuggestion | null>(null);

  // Query cached insights
  const { data: insightsData, isLoading, isError } = useQuery({
    queryKey: ["insights", jobId],
    queryFn: () => getJobInsights(jobId),
    retry: false, // 404 means not generated yet
  });

  const insights: ImprovementInsights | undefined = insightsData;

  // Mutation to generate or refresh
  const generateMutation = useMutation({
    mutationFn: (refresh: boolean) => generateJobInsights(jobId, refresh),
    onSuccess: (data) => {
      queryClient.setQueryData(["insights", jobId], data);
    },
  });

  const isGenerating = generateMutation.isPending;

  // Un-generated state
  if (!insights && !isGenerating && (isError || !isLoading)) {
    return (
      <div className="rounded-xl border border-line bg-raised p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-3">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="font-display font-bold text-lg text-ink uppercase mb-1">
          AI Cycle-Improvement Insights
        </h3>
        <p className="text-xs text-ink-faint max-w-md mx-auto mb-5 leading-relaxed">
          Generate an on-demand, data-grounded study report to identify your primary bottleneck, flag non-value-add motions, explore equipment upgrades, and project potential cycle time savings.
        </p>
        <button
          onClick={() => generateMutation.mutate(false)}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-xs font-semibold text-accent-ink hover:bg-accent/90 transition-colors shadow-sm"
        >
          <span>⚡ Generate Improvement Insights</span>
        </button>
      </div>
    );
  }

  // Loading skeleton state
  if (isGenerating || (isLoading && !insights)) {
    return (
      <div className="rounded-xl border border-line bg-raised p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="font-display text-sm font-bold uppercase text-ink">
            Analyzing motion study & generating cycle-improvement insights...
          </span>
        </div>
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-lg bg-raised-2/80" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 animate-pulse rounded-lg bg-raised-2/80" />
            <div className="h-32 animate-pulse rounded-lg bg-raised-2/80" />
          </div>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const { bottleneck, elimination_candidates, equipment_upgrades, projected_summary } = insights;
  const currentSec = projected_summary.current_cycle_sec;
  const projSec = projected_summary.projected_cycle_sec;
  const curVa = projected_summary.current_va_sec;
  const curNva = projected_summary.current_nva_sec;
  const projNva = projected_summary.projected_nva_sec;

  const curVaPct = currentSec > 0 ? Math.round((curVa / currentSec) * 100) : 0;
  const curNvaPct = 100 - curVaPct;
  const projVaPct = projSec > 0 ? Math.round((curVa / projSec) * 100) : 0;
  const projNvaPct = 100 - projVaPct;

  return (
    <div className="rounded-xl border border-line bg-raised p-5 sm:p-7 space-y-7">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
            <h2 className="font-display text-lg font-extrabold uppercase text-ink tracking-wide">
              AI Cycle-Improvement Insights
            </h2>
          </div>
          <p className="text-xs text-ink-faint mt-0.5">
            Engineered recommendations based on Pareto bottleneck analysis & motion data.
          </p>
        </div>
        <button
          onClick={() => generateMutation.mutate(true)}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 rounded border border-line bg-raised-2 px-3 py-1.5 text-[11px] font-semibold text-ink-dim hover:bg-line/40 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Insights
        </button>
      </div>

      {/* SECTION A: Bottleneck Identification */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-nva text-[10px] font-bold text-white">A</span>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Bottleneck Identification
          </h3>
        </div>

        <div className="rounded-lg border border-nva/30 bg-nva-soft/30 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-nva">
                Primary Station Bottleneck
              </span>
              <h4 className="font-semibold text-ink text-base">
                #{bottleneck.s_no} — {bottleneck.activity_name}
              </h4>
            </div>
            <div className="text-right">
              <span className="font-mono text-base font-extrabold text-nva">
                {bottleneck.time_sec.toFixed(1)}s
              </span>
              <span className="ml-2 font-mono text-xs font-semibold text-ink-faint">
                ({bottleneck.pct_of_cycle.toFixed(1)}% of cycle time · {bottleneck.tmu.toFixed(0)} TMU)
              </span>
            </div>
          </div>
          <p className="text-xs text-ink-dim leading-relaxed">
            {bottleneck.reason}
          </p>
        </div>
      </div>

      {/* SECTION B: Non-Value-Add Elimination Candidates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-accent text-[10px] font-bold text-accent-ink">B</span>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Non-Value-Add Elimination Candidates
          </h3>
        </div>

        {elimination_candidates.length === 0 ? (
          <div className="rounded-lg border border-line bg-raised-2/50 p-4 text-xs text-ink-faint italic">
            No distinct non-value-add waste motions detected for elimination.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {elimination_candidates.map((cand, idx) => (
              <div key={idx} className="rounded-lg border border-line bg-raised-2/40 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-ink text-xs truncate max-w-[200px]">
                      #{cand.s_no} — {cand.activity_name}
                    </span>
                    <span className="rounded bg-nva/10 px-2 py-0.5 font-mono text-[10px] font-bold text-nva">
                      -{cand.potential_saving_sec.toFixed(1)}s saving
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="inline-block rounded bg-line px-1.5 py-0.5 font-mono text-[9.5px] uppercase font-semibold text-ink-dim">
                      {cand.waste_type}
                    </span>
                  </div>
                  <p className="text-xs text-ink-faint leading-relaxed">
                    {cand.reason}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between text-[11px] font-mono text-ink-dim">
                  <span>Current Cost: {cand.current_time_sec.toFixed(1)}s</span>
                  <span className="text-accent font-semibold">Eliminable / Reducible</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION C: Equipment & Method Upgrade Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-600 text-[10px] font-bold text-white">C</span>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Equipment & Method Upgrade Suggestions
          </h3>
        </div>

        {equipment_upgrades.length === 0 ? (
          <div className="rounded-lg border border-line bg-raised-2/50 p-4 text-xs text-ink-faint italic">
            No equipment upgrades identified for current motion profile.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {equipment_upgrades.map((eq, idx) => (
              <div key={idx} className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-ink text-xs truncate max-w-[220px]">
                      #{eq.s_no} — {eq.activity_name}
                    </span>
                    <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-800">
                      {eq.disclaimer}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-ink-dim">
                    <div>
                      <span className="font-medium text-ink-faint">Observed Method: </span>
                      <span>{eq.current_tool_or_method}</span>
                    </div>
                    <div>
                      <span className="font-medium text-purple-700">Suggested Upgrade: </span>
                      <span className="font-semibold text-ink">{eq.suggested_upgrade}</span>
                    </div>
                    {eq.top_vendors && eq.top_vendors.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-ink-faint font-medium">Top Brands:</span>
                        {eq.top_vendors.slice(0, 3).map((v, vIdx) => (
                          <span key={vIdx} className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-purple-800">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedUpgrade(eq)}
                        className="inline-flex items-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors shadow-xs cursor-pointer"
                      >
                        <span>🏭 Verify Product Specs & Supplier Catalogs ↗</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-purple-500/10 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-ink-faint">Projected: {eq.projected_time_sec.toFixed(1)}s</span>
                  <span className="text-purple-600 font-bold">-{eq.time_saved_sec.toFixed(1)}s saving</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION D: Projected New Cycle Time Summary */}
      <div className="pt-2 border-t border-line">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-va text-[10px] font-bold text-white">D</span>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Projected New Cycle Time Summary
          </h3>
        </div>

        {/* Disclaimer Banner */}
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 flex items-center gap-2">
          <span>⚠️</span>
          <span>{projected_summary.disclaimer}</span>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="rounded-lg border border-line bg-raised-2 p-3 text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint block">Baseline Cycle</span>
            <span className="font-mono text-lg font-bold text-ink">{currentSec.toFixed(1)}s</span>
            <span className="text-[10px] font-mono text-ink-faint block">({projected_summary.current_tmu.toFixed(0)} TMU)</span>
          </div>
          <div className="rounded-lg border border-va/30 bg-va/5 p-3 text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-va block">Projected Cycle</span>
            <span className="font-mono text-lg font-bold text-va">{projSec.toFixed(1)}s</span>
            <span className="text-[10px] font-mono text-va/80 block">({projected_summary.projected_tmu.toFixed(0)} TMU)</span>
          </div>
          <div className="rounded-lg border border-line bg-raised-2 p-3 text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint block">Time Reduction</span>
            <span className="font-mono text-lg font-bold text-accent">-{projected_summary.total_saving_sec.toFixed(1)}s</span>
          </div>
          <div className="rounded-lg border border-line bg-raised-2 p-3 text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint block">Efficiency Gain</span>
            <span className="font-mono text-lg font-bold text-va">+{projected_summary.pct_reduction.toFixed(1)}%</span>
          </div>
        </div>

        {/* Visual Before / After Time Distribution Comparison */}
        <div className="rounded-lg border border-line bg-raised-2/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
              Before / After Time Breakdown Comparison
            </span>
            <div className="flex rounded border border-line bg-raised p-0.5 text-[10px] font-mono">
              <button
                onClick={() => setViewMode("before_after")}
                className={`px-2 py-0.5 rounded ${viewMode === "before_after" ? "bg-accent text-accent-ink font-bold" : "text-ink-faint"}`}
              >
                Stacked Bars
              </button>
              <button
                onClick={() => setViewMode("side_by_side")}
                className={`px-2 py-0.5 rounded ${viewMode === "side_by_side" ? "bg-accent text-accent-ink font-bold" : "text-ink-faint"}`}
              >
                Side-by-Side
              </button>
            </div>
          </div>

          {viewMode === "before_after" ? (
            <div className="space-y-4 font-mono text-xs">
              {/* Baseline Bar */}
              <div>
                <div className="flex justify-between mb-1 text-[11px]">
                  <span className="text-ink font-semibold">Baseline ({currentSec.toFixed(1)}s)</span>
                  <span className="text-ink-faint">VA: {curVa.toFixed(1)}s ({curVaPct}%) | NVA: {curNva.toFixed(1)}s ({curNvaPct}%)</span>
                </div>
                <div className="flex h-6 w-full overflow-hidden rounded bg-line">
                  <div style={{ width: `${curVaPct}%` }} className="bg-va flex items-center justify-center text-[10px] font-bold text-white">
                    VA ({curVaPct}%)
                  </div>
                  <div style={{ width: `${curNvaPct}%` }} className="bg-nva flex items-center justify-center text-[10px] font-bold text-white">
                    NVA ({curNvaPct}%)
                  </div>
                </div>
              </div>

              {/* Projected Bar */}
              <div>
                <div className="flex justify-between mb-1 text-[11px]">
                  <span className="text-va font-semibold">Projected ({projSec.toFixed(1)}s)</span>
                  <span className="text-va">VA: {curVa.toFixed(1)}s ({projVaPct}%) | Reduced NVA: {projNva.toFixed(1)}s ({projNvaPct}%)</span>
                </div>
                <div className="flex h-6 w-full overflow-hidden rounded bg-line">
                  <div style={{ width: `${projVaPct}%` }} className="bg-va flex items-center justify-center text-[10px] font-bold text-white">
                    VA ({projVaPct}%)
                  </div>
                  <div style={{ width: `${projNvaPct}%` }} className="bg-nva/70 flex items-center justify-center text-[10px] font-bold text-white">
                    NVA ({projNvaPct}%)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 font-mono text-xs text-center">
              <div className="rounded border border-line bg-raised p-3">
                <span className="text-[11px] font-bold text-ink block mb-1">Baseline</span>
                <span className="text-lg font-extrabold text-ink">{currentSec.toFixed(1)}s</span>
                <div className="mt-2 space-y-1 text-[11px]">
                  <div className="text-va">VA: {curVa.toFixed(1)}s ({curVaPct}%)</div>
                  <div className="text-nva">NVA: {curNva.toFixed(1)}s ({curNvaPct}%)</div>
                </div>
              </div>
              <div className="rounded border border-va/30 bg-va/5 p-3">
                <span className="text-[11px] font-bold text-va block mb-1">Projected</span>
                <span className="text-lg font-extrabold text-va">{projSec.toFixed(1)}s</span>
                <div className="mt-2 space-y-1 text-[11px]">
                  <div className="text-va">VA: {curVa.toFixed(1)}s ({projVaPct}%)</div>
                  <div className="text-nva">NVA: {projNva.toFixed(1)}s ({projNvaPct}%)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Industrial Product Verification & Vendor Specs Modal */}
      {selectedUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-2xl border border-purple-500/30 bg-raised p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <span className="rounded bg-purple-100 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                  Industrial Tool Specification & Verification
                </span>
                <h3 className="font-display text-lg font-bold text-ink mt-1">
                  {selectedUpgrade.suggested_upgrade}
                </h3>
                <p className="text-xs text-ink-faint">
                  Target Activity #{selectedUpgrade.s_no}: <span className="text-ink font-medium">{selectedUpgrade.activity_name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUpgrade(null)}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-raised-2 hover:text-ink transition-colors cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Equipment Category Preview Image */}
            {selectedUpgrade.image_url && (
              <div className="overflow-hidden rounded-xl border border-line bg-slate-900 flex items-center justify-center p-2 max-h-48 shadow-inner">
                <img
                  src={selectedUpgrade.image_url}
                  alt={selectedUpgrade.suggested_upgrade}
                  className="max-h-44 w-auto object-contain rounded-lg transition-transform hover:scale-102"
                />
              </div>
            )}

            {/* Observed Method vs Target Savings */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-purple-500/10 bg-purple-500/5 p-3.5 text-xs font-mono">
              <div>
                <span className="text-ink-faint block text-[10px] uppercase font-bold">Observed Method</span>
                <span className="text-ink font-semibold text-xs">{selectedUpgrade.current_tool_or_method}</span>
              </div>
              <div>
                <span className="text-purple-700 block text-[10px] uppercase font-bold">Targeted Time Saving</span>
                <span className="text-purple-800 font-extrabold text-xs">
                  -{selectedUpgrade.time_saved_sec.toFixed(1)}s per cycle (New: {selectedUpgrade.projected_time_sec.toFixed(1)}s)
                </span>
              </div>
            </div>

            {/* Core Required Specifications */}
            {selectedUpgrade.key_specs && selectedUpgrade.key_specs.length > 0 && (
              <div>
                <h4 className="font-semibold text-xs text-ink uppercase tracking-wider mb-2">
                  ⚙️ Key Required Technical Specifications:
                </h4>
                <ul className="space-y-1.5 text-xs text-ink-dim">
                  {selectedUpgrade.key_specs.map((spec, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Leading Manufacturers */}
            {selectedUpgrade.top_vendors && selectedUpgrade.top_vendors.length > 0 && (
              <div>
                <h4 className="font-semibold text-xs text-ink uppercase tracking-wider mb-2">
                  🏭 Top Industrial Brands & Suppliers:
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedUpgrade.top_vendors.map((v, vIdx) => (
                    <span key={vIdx} className="rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-900 shadow-2xs">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 italic font-mono">
              ⚠️ {selectedUpgrade.disclaimer}. Verification of torque rating, pneumatic pressure, and ergonomics required by station process engineer.
            </div>

            {/* 3 Commercial Action Buttons */}
            <div className="pt-2 border-t border-line flex flex-col sm:flex-row items-center gap-2 justify-end">
              {selectedUpgrade.shopping_url && (
                <a
                  href={selectedUpgrade.shopping_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white transition-colors shadow-sm"
                >
                  <span>🛒 View Commercial Pricing on Google Shopping ↗</span>
                </a>
              )}
              {selectedUpgrade.mcmaster_url && (
                <a
                  href={selectedUpgrade.mcmaster_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-raised hover:bg-raised-2 px-4 py-2 text-xs font-semibold text-ink transition-colors"
                >
                  <span>🏭 McMaster-Carr Catalog ↗</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedUpgrade(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-ink-faint hover:text-ink transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
