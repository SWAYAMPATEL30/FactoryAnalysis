import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../types/models";

export function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  
  // Sign In state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPass, setSignInPass] = useState("");
  
  // Sign Up state
  const [signUpName, setSignUpName] = useState("");
  const [signUpCompany, setSignUpCompany] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPass, setSignUpPass] = useState("");
  const [signUpRole, setSignUpRole] = useState<Role>("engineer");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!signInEmail.trim() || !signInPass.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    const res = await signInWithEmail(signInEmail.trim(), signInPass.trim());
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      navigate("/app/dashboard");
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!signUpEmail.trim() || !signUpPass.trim() || !signUpName.trim() || !signUpCompany.trim()) {
      setError("Please fill out all required fields.");
      return;
    }
    if (signUpPass.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const res = await signUpWithEmail(
      signUpEmail.trim(),
      signUpPass.trim(),
      signUpName.trim(),
      signUpCompany.trim(),
      signUpRole
    );
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      navigate("/app/dashboard");
    }
  }

  async function handleGoogleOAuth() {
    setError("");
    setLoading(true);
    const res = await signInWithGoogle();
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      navigate("/app/dashboard");
    }
  }

  function handleDemoAccess(company: string, name: string, role: Role) {
    login(company, name, role);
    navigate("/app/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-body selection:bg-sky-500 selection:text-white">
      {/* Background ambient lighting grid */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <Link to="/" className="flex items-center gap-3 mb-6 no-underline group z-10">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-sky-400/30 p-0.5 shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
          <img
            src="/marketing/factory_logo_mark.png"
            alt="Factory Video Analysis"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-body font-bold text-lg text-white tracking-tight leading-tight">
            Factory Video Analysis
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-widest text-sky-400 font-semibold leading-tight mt-0.5">
            Industrial Intelligence Platform
          </span>
        </div>
      </Link>

      {/* Compact Auth Card (max-w-md ~400px width per prompt instruction) */}
      <div className="w-full max-w-[420px] bg-[#0f172a]/95 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl z-10 relative">
        {/* Sign In / Sign Up Mode Switcher */}
        <div className="flex bg-[#080e1a] p-1 rounded-xl mb-6 border border-slate-800">
          <button
            onClick={() => { setMode("signin"); setError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signin"
                ? "bg-sky-500 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-sky-500 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Sign In Form */}
        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address <span className="text-sky-400">*</span>
              </label>
              <input
                type="email"
                required
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                placeholder="engineer@borgwarner.com"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs text-white bg-slate-900/90 border border-slate-700/80 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password <span className="text-sky-400">*</span>
              </label>
              <input
                type="password"
                required
                value={signInPass}
                onChange={(e) => setSignInPass(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs text-white bg-slate-900/90 border border-slate-700/80 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 font-semibold text-white text-xs shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-blue-500 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Verifying Credentials…" : "Sign In to Workspace →"}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name <span className="text-sky-400">*</span>
              </label>
              <input
                type="text"
                required
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                placeholder="Priya Sharma"
                className="w-full rounded-xl px-3 py-2 text-xs text-white bg-slate-900/90 border border-slate-700/80 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Organization / Company <span className="text-sky-400">*</span>
              </label>
              <input
                type="text"
                required
                value={signUpCompany}
                onChange={(e) => setSignUpCompany(e.target.value)}
                placeholder="BorgWarner"
                className="w-full rounded-xl px-3 py-2 text-xs text-white bg-slate-900/90 border border-slate-700/80 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address <span className="text-sky-400">*</span>
              </label>
              <input
                type="email"
                required
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                placeholder="priya@borgwarner.com"
                className="w-full rounded-xl px-3 py-2 text-xs text-white bg-slate-900/90 border border-slate-700/80 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Set Password <span className="text-sky-400">*</span>
              </label>
              <input
                type="password"
                required
                value={signUpPass}
                onChange={(e) => setSignUpPass(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl px-3 py-2 text-xs text-white bg-slate-900/90 border border-slate-700/80 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
              <select
                value={signUpRole}
                onChange={(e) => setSignUpRole(e.target.value as Role)}
                className="w-full rounded-xl px-3 py-2 text-xs text-white bg-slate-900/90 border border-slate-700/80 focus:outline-none focus:border-sky-400"
              >
                <option value="engineer">Industrial Engineer (Upload & Review)</option>
                <option value="manager">Plant Manager (Full Access)</option>
                <option value="viewer">Executive Viewer (Read-only)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 font-semibold text-white text-xs shadow-lg shadow-sky-500/25 hover:from-sky-400 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Creating Supabase Account…" : "Register & Start Study →"}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-[10px] font-mono uppercase text-slate-500">OR CONTINUE WITH</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* OAuth Button */}
        <button
          onClick={handleGoogleOAuth}
          disabled={loading}
          className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Demo Quick Access */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
            DEMO WORKSPACE PREVIEW
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleDemoAccess("BorgWarner", "Demo Engineer", "engineer")}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:border-sky-400/50 hover:text-white transition-all cursor-pointer truncate"
            >
              BorgWarner Demo
            </button>
            <button
              onClick={() => handleDemoAccess("Global Tech", "Demo Engineer", "engineer")}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:border-sky-400/50 hover:text-white transition-all cursor-pointer truncate"
            >
              Global Tech Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
