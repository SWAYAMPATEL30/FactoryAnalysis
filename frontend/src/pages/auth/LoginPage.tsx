import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../types/models";

const DEMO_COMPANIES = [
  { name: "BorgWarner", description: "3 workstations · Growth plan" },
  { name: "Global Tech", description: "2 workstations · Starter plan" },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState<Role>("engineer");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !userName.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    login(companyName.trim(), userName.trim(), role);
    navigate("/app/dashboard");
  }

  function enterDemo(name: string) {
    login(name, "Demo Engineer", "engineer");
    navigate("/app/dashboard");
  }

  return (
    <div className="min-h-screen flex bg-navy">
      {/* Left: Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 4L10 9L13 6L15 12H2Z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <span className="font-display font-bold text-xl uppercase tracking-wide text-white">
            FactoryAnalysis
          </span>
        </div>

        <h1 className="font-display font-extrabold text-4xl uppercase text-white leading-tight mb-2">
          Sign in to<br />your workspace
        </h1>
        <p className="text-white/50 text-sm mb-10">
          Enter your company and name to access your workspace.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-white/50 mb-1.5">
              Company name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. BorgWarner"
              className="w-full rounded-md border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-white/50 mb-1.5">
              Your name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full rounded-md border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-white/50 mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-md border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="admin" className="bg-navy">Admin</option>
              <option value="engineer" className="bg-navy">Engineer</option>
              <option value="viewer" className="bg-navy">Viewer</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
          >
            Enter workspace
          </button>
        </form>

        {/* Demo shortcuts */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30 uppercase tracking-widest">Or try a demo</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="flex flex-col gap-2">
            {DEMO_COMPANIES.map((c) => (
              <button
                key={c.name}
                onClick={() => enterDemo(c.name)}
                className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-4 py-3 hover:border-accent/50 hover:bg-white/10 transition-all text-left"
              >
                <div>
                  <div className="text-sm font-medium text-white">{c.name}</div>
                  <div className="text-xs text-white/40">{c.description}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-white/40">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Factory image */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img
          src="/marketing/hero-factory.jpg"
          alt="Factory floor"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/60 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <blockquote className="max-w-sm">
            <p className="text-xl font-display font-bold text-white/90 leading-snug mb-4">
              "What used to take an IE 45 minutes with a stopwatch now takes us 5 minutes — and the data is more consistent."
            </p>
            <cite className="text-sm text-white/50 not-italic">
              Plant Manager, Tier 1 automotive supplier
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
