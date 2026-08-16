import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useWorkstations } from "../../context/WorkstationContext";
import { getTrend, tmuToCycleTime } from "../../types/models";
import type { Trend } from "../../types/models";

const TREND_BADGE: Record<Trend, { label: string; classes: string }> = {
  improving:  { label: "↓ Improving",  classes: "bg-green-100 text-green-800 border-green-200" },
  stable:     { label: "→ Stable",     classes: "bg-amber-100 text-amber-800 border-amber-200"  },
  regressing: { label: "↑ Regressing", classes: "bg-red-100 text-red-800 border-red-200"   },
  new:        { label: "◌ New",        classes: "bg-blue-100 text-blue-800 border-blue-200"   },
};

export function WorkstationsListPage() {
  const { company, user } = useAuth();
  const { getWorkstationsForCompany, getVideosForWorkstation, createWorkstation, deleteWorkstation } = useWorkstations();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", line: "" });
  const [saving, setSaving] = useState(false);

  const stations = company ? getWorkstationsForCompany(company.id) : [];
  const canEdit = user?.role !== "viewer";

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!company || !form.name.trim()) return;
    setSaving(true);
    createWorkstation({ companyId: company.id, name: form.name, description: form.description, line: form.line });
    setForm({ name: "", description: "", line: "" });
    setShowForm(false);
    setSaving(false);
  }

  return (
    <div className="px-4 py-6 sm:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-ink-faint mb-1">{company?.name}</div>
          <h1 className="font-display font-extrabold text-3xl uppercase text-ink">Workstations</h1>
          <p className="text-sm text-ink-dim mt-1">{stations.length} station{stations.length !== 1 ? "s" : ""}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors min-h-[44px]"
          >
            + New workstation
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-accent/30 bg-accent-soft p-6">
          <h2 className="font-semibold text-ink mb-4">Create workstation</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-faint uppercase tracking-wide mb-1.5">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Station 1 – Press Fit"
                className="w-full rounded-md border border-line bg-raised px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-faint uppercase tracking-wide mb-1.5">Line / Area</label>
              <input
                value={form.line}
                onChange={(e) => setForm({ ...form, line: e.target.value })}
                placeholder="e.g. Line 2B"
                className="w-full rounded-md border border-line bg-raised px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-faint uppercase tracking-wide mb-1.5">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this station does"
                className="w-full rounded-md border border-line bg-raised px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent min-h-[44px]"
              />
            </div>
            <div className="md:col-span-3 flex gap-3 flex-wrap">
              <button type="submit" disabled={saving}
                className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors min-h-[44px]">
                {saving ? "Creating…" : "Create workstation"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-md border border-line px-5 py-2.5 text-sm text-ink hover:border-accent transition-colors min-h-[44px]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workstation list */}
      {stations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-20 text-center text-ink-faint">
          <div className="text-4xl mb-4">🏭</div>
          <p className="font-semibold text-ink mb-2">No workstations yet</p>
          <p className="text-sm mb-6">Create a workstation to start uploading videos and running MOST studies.</p>
          {canEdit && (
            <button onClick={() => setShowForm(true)} className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors">
              Create first workstation
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_120px_40px] gap-4 px-5 text-xs font-medium uppercase tracking-wide text-ink-faint">
            <span>Workstation</span>
            <span>Line</span>
            <span>Latest TMU</span>
            <span>Studies</span>
            <span>Trend</span>
            <span></span>
          </div>
          {stations.map((ws) => {
            const vids = getVideosForWorkstation(ws.id);
            const trend = getTrend(vids);
            const cfg = TREND_BADGE[trend];
            const latest = vids.find((v) => v.status === "COMPLETED");
            return (
              <div key={ws.id} className="relative group">
                <Link
                  to={`/app/workstations/${ws.id}`}
                  className="block rounded-xl border border-line bg-raised hover:border-accent/40 hover:shadow-sm transition-all"
                >
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_120px_40px] gap-4 items-center p-5">
                    <div>
                      <div className="font-semibold text-ink">{ws.name}</div>
                      <div className="text-xs text-ink-faint mt-0.5 line-clamp-1">{ws.description}</div>
                    </div>
                    <div className="text-sm text-ink-dim">{ws.line || "—"}</div>
                    <div>
                      {latest ? (
                        <>
                          <div className="font-mono font-bold text-ink">{latest.cycletime_tmu?.toLocaleString()}</div>
                          <div className="text-xs text-ink-faint">{tmuToCycleTime(latest.cycletime_tmu ?? 0)}</div>
                        </>
                      ) : (
                        <span className="text-ink-faint text-sm">—</span>
                      )}
                    </div>
                    <div className="text-sm text-ink-dim">{vids.length} {vids.length === 1 ? "study" : "studies"}</div>
                    <div>
                      <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.classes}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete workstation "${ws.name}"?`)) {
                              deleteWorkstation(ws.id);
                            }
                          }}
                          className="p-2 text-ink-faint hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete workstation"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
