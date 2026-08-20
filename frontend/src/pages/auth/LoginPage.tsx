import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../types/models";

const DEMO_COMPANIES = [
  { name: "ABC Corp", description: "3 workstations · Growth plan", icon: "🏭" },
  { name: "XYZ Industries", description: "2 workstations · Starter plan", icon: "⚙️" },
];

const FEATURES = [
  { icon: "🎯", text: "AI Time & Motion Analysis" },
  { icon: "🔒", text: "100% Privacy — faces auto-blurred" },
  { icon: "📊", text: "PMTS Study in under 5 minutes" },
  { icon: "🛠️", text: "MUDA & Waste Identification" },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState<Role>("engineer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !userName.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      login(companyName.trim(), userName.trim(), role);
      navigate("/app/dashboard");
    }, 600);
  }

  function enterDemo(name: string) {
    setLoading(true);
    setTimeout(() => {
      login(name, "Demo Engineer", "engineer");
      navigate("/app/dashboard");
    }, 400);
  }

  return (
    <div className="h-screen max-h-screen w-full flex flex-col lg:flex-row bg-navy overflow-hidden">

      {/* ── Left Panel: Form ─────────────────────────────────────── */}
      <div className="flex flex-col justify-between w-full lg:w-[460px] xl:w-[490px] shrink-0 px-6 sm:px-8 pt-4 pb-4 lg:pt-6 lg:pb-5 relative z-10 h-full overflow-y-auto lg:overflow-hidden">

        {/* Background grid texture on mobile only */}
        <div
          className="absolute inset-0 opacity-[0.03] lg:hidden"
          style={{
            backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative w-full max-w-sm mx-auto lg:mx-0">

          {/* ── Logo ── */}
          <div className="mb-3.5">
            <img
              src="/images/combined_brand.png"
              alt="ambade IENEXT"
              className="h-[56px] w-auto object-contain self-start shrink-0 filter drop-shadow-md"
            />
          </div>

          {/* ── Heading ── */}
          <div className="mb-4">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl uppercase text-white leading-tight mb-1">
              Sign in to <span className="text-accent">your workspace</span>
            </h1>
            <p className="text-white/50 text-xs leading-relaxed">
              Enter your company and name to access your PMTS analysis workspace.
            </p>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">

            {/* Company Name */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setError(""); }}
                placeholder="e.g. ABC Corp"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                autoComplete="organization"
              />
            </div>

            {/* Your Name */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => { setUserName(e.target.value); setError(""); }}
                placeholder="e.g. Priya Sharma"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                autoComplete="name"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">
                Role
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all cursor-pointer"
                >
                  <option value="admin" className="bg-[#0f1729]">Admin</option>
                  <option value="engineer" className="bg-[#0f1729]">Engineer</option>
                  <option value="viewer" className="bg-[#0f1729]">Viewer</option>
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 5l4 4 4-4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative mt-1 w-full rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white hover:bg-accent/90 active:scale-[0.98] transition-all shadow-md shadow-accent/20 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Entering workspace…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Enter Workspace
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* ── Demo shortcuts ── */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Or try a quick demo</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            <div className="flex flex-col gap-1.5">
              {DEMO_COMPANIES.map((c) => (
                <button
                  key={c.name}
                  onClick={() => enterDemo(c.name)}
                  disabled={loading}
                  className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 hover:border-accent/40 hover:bg-white/8 transition-all text-left group disabled:opacity-50"
                >
                  <span className="text-base">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white group-hover:text-accent transition-colors truncate">{c.name}</div>
                    <div className="text-[10px] text-white/35 truncate">{c.description}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-white/25 group-hover:text-accent transition-colors shrink-0">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <p className="mt-3 text-center text-[10px] text-white/20">
            © 2026 Ambade · IENEXT
          </p>
        </div>
      </div>

      {/* ── Right Panel: Visual ─────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden h-full">

        {/* Factory image */}
        <img
          src="/marketing/hero-factory.jpg"
          alt="Smart factory floor"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/50 to-navy/20" />
        <div className="absolute inset-0 bg-navy/30" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-10 w-full h-full">

          {/* Top badge */}
          <div className="flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-accent" />
            <span className="font-mono text-xs uppercase tracking-widest text-accent">
              PMTS Analysis Platform
            </span>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-3 my-auto">
            <h2 className="font-display font-extrabold text-3xl xl:text-4xl uppercase text-white leading-tight max-w-md">
              Every motion,<br />
              <span className="text-accent">measured.</span><br />
              Automatically.
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-2.5">
                  <span className="text-base">{f.icon}</span>
                  <span className="text-xs text-white/70 font-medium">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <blockquote className="max-w-sm border-l-2 border-accent pl-3">
            <p className="text-xs font-display font-semibold text-white/80 leading-snug mb-1">
              "What used to take 45 minutes with a stopwatch now takes us 5 minutes — and the data is more consistent."
            </p>
            <cite className="text-[10px] text-white/40 not-italic font-mono uppercase tracking-wide">
              Plant Manager, Tier 1 Automotive Supplier
            </cite>
          </blockquote>
        </div>
      </div>

      {/* ── Mobile Hero Strip (visible on sm/md only) ── */}
      <div className="lg:hidden w-full relative overflow-hidden" style={{ height: "180px" }}>
        <img
          src="/marketing/hero-factory.jpg"
          alt="Factory floor"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy to-transparent" />
        <div className="absolute bottom-4 left-6 right-6 flex flex-wrap gap-2">
          {FEATURES.map((f) => (
            <span key={f.text} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-navy/80 backdrop-blur px-3 py-1 text-[11px] text-white/60">
              <span>{f.icon}</span>
              <span>{f.text}</span>
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
