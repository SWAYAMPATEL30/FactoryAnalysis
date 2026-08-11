import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, validateEmailFormat } from "../../context/AuthContext";
import { BrandLogo, BrandTitle } from "../../components/ui/BrandLogo";
import type { Role } from "../../types/models";

const VIDEOS = [
  "/marketing/factory1.mp4",
  "/marketing/factory2.mp4",
  "/marketing/factory3.mp4",
  "/marketing/factory4.mp4",
];

const DEMO_COMPANIES = [
  { name: "ABC Corp", description: "3 workstations · Growth plan" },
  { name: "XYZ Industries", description: "2 workstations · Starter plan" },
];

function LoginVideoBackground() {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = sessionStorage.getItem("login_video_index");
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      return (idx + 1) % VIDEOS.length;
    }
    return 0;
  });

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    sessionStorage.setItem("login_video_index", currentIndex.toString());
    
    const currentVid = videoRefs.current[currentIndex];
    if (currentVid) {
      currentVid.currentTime = 0;
      currentVid.playbackRate = 0.65;
      currentVid.play().catch(() => {});
    }
    
    const nextIndex = (currentIndex + 1) % VIDEOS.length;
    const nextVid = videoRefs.current[nextIndex];
    if (nextVid) {
      nextVid.preload = "auto";
    }

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % VIDEOS.length);
    }, 25000);

    return () => {
      clearTimeout(timer);
      if (currentVid) {
        currentVid.pause();
      }
    };
  }, [currentIndex]);

  const handleEnded = () => {
    setCurrentIndex((prev) => (prev + 1) % VIDEOS.length);
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#05070c]">
      {VIDEOS.map((src, idx) => (
        <video
          key={src}
          ref={(el) => {
             videoRefs.current[idx] = el;
          }}
          src={src}
          muted
          playsInline
          onEnded={idx === currentIndex ? handleEnded : undefined}
          preload={idx === currentIndex ? "auto" : "none"}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 blur-sm scale-105"
          style={{ opacity: idx === currentIndex ? 1 : 0 }}
        />
      ))}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          background: "linear-gradient(to right, rgba(5,7,12,0.85) 0%, rgba(5,7,12,0.65) 30%, rgba(5,7,12,0.4) 100%)"
        }}
      />
    </div>
  );
}

export function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resendVerificationEmail } = useAuth();
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
  const [successBanner, setSuccessBanner] = useState("");
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessBanner("");
    setUnconfirmedEmail("");

    const emailCheck = validateEmailFormat(signInEmail);
    if (!emailCheck.valid) {
      setError(emailCheck.error!);
      return;
    }

    if (!signInPass.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    const res = await signInWithEmail(signInEmail.trim(), signInPass.trim());
    setLoading(false);

    if (res.error) {
      setError(res.error);
      if (res.code === "unconfirmed") {
        setUnconfirmedEmail(signInEmail.trim());
      }
    } else {
      navigate("/app/dashboard");
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessBanner("");
    setUnconfirmedEmail("");

    if (!signUpName.trim() || !signUpCompany.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    const emailCheck = validateEmailFormat(signUpEmail);
    if (!emailCheck.valid) {
      setError(emailCheck.error!);
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
      setSuccessBanner(`Verification email sent to ${signUpEmail.trim()}. Check your inbox and click the link to activate your account before signing in.`);
      setMode("signin");
      setSignInEmail(signUpEmail.trim());
      setSignInPass("");
    }
  }

  async function handleResend() {
    if (!unconfirmedEmail) return;
    setLoading(true);
    const { error: resendErr } = await resendVerificationEmail(unconfirmedEmail);
    setLoading(false);
    if (resendErr) {
      setError(resendErr);
    } else {
      setError("");
      setUnconfirmedEmail("");
      setSuccessBanner(`Verification email resent to ${unconfirmedEmail}.`);
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

  async function handleDemoAccess(company: string, name: string, role: Role) {
    const demoEmail = company === "BorgWarner" ? "demo@borgwarner.com" : "demo@globaltech.com";
    const demoPass = "demo123";
    
    setError("");
    setSuccessBanner("");
    setLoading(true);
    const res = await signInWithEmail(demoEmail, demoPass);
    setLoading(false);
    
    if (res.error) {
      setError(`Demo account login failed: ${res.error}. Please ensure demo accounts are seeded.`);
    } else {
      navigate("/app/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-start px-4 md:pl-[12vw] relative overflow-hidden font-body selection:bg-sky-500 selection:text-white z-0">
      <LoginVideoBackground />

      {/* Brand Header */}
      <Link to="/" className="flex items-center gap-3 mb-6 no-underline group z-10 hover:opacity-80 transition-opacity">
        <BrandLogo className="w-10 h-10 group-hover:scale-105 transition-transform" />
        <div className="flex flex-col">
          <BrandTitle className="text-xl" />
          <span className="font-mono text-[9.5px] uppercase tracking-widest text-sky-400 font-semibold leading-tight mt-0.5">
            Industrial Intelligence Platform
          </span>
        </div>
      </Link>

      {/* Compact Auth Card (max-w-md ~400px width per prompt instruction) */}
      <div className="w-full max-w-[420px] bg-[rgba(15,18,26,0.55)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-[20px] z-10 relative">
        {/* Sign In / Sign Up Mode Switcher */}
        <div className="flex bg-[#080e1a] p-1 rounded-xl mb-6 border border-slate-800">
          <button
            onClick={() => { setMode("signin"); setError(""); setSuccessBanner(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signin"
                ? "bg-sky-500 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); setSuccessBanner(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-sky-500 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Success Alert */}
        {successBanner && (
          <div className="mb-5 p-3 rounded-lg bg-[#5B7A99]/20 border border-[#5B7A99]/50 text-[#5B7A99] text-xs font-medium flex items-center gap-2 leading-relaxed">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{successBanner}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-[#B04A3F]/10 border border-[#B04A3F]/30 text-[#B04A3F] text-xs font-medium flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
            {unconfirmedEmail && (
              <button 
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="self-start ml-6 text-sky-400 hover:text-sky-300 underline font-semibold text-[11px] cursor-pointer"
              >
                Resend verification email
              </button>
            )}
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
                placeholder="••••••••"
                className="w-full rounded-xl px-3 py-2 text-xs text-white bg-slate-900/90 border border-slate-700/80 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1 ml-1">Must be at least 6 characters long.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
              <select
                value={signUpRole}
                onChange={(e) => setSignUpRole(e.target.value as Role)}
                className="w-full rounded-xl px-3 py-2 text-xs text-white bg-slate-900/90 border border-slate-700/80 focus:outline-none focus:border-sky-400"
              >
                <option value="manager">Manager</option>
                <option value="engineer">Employee</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 font-semibold text-white text-xs shadow-lg shadow-sky-500/25 hover:from-sky-400 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Creating Account…" : "Register"}
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
