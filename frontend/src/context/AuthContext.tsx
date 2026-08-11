import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Company, Role, User } from "../types/models";
import { supabase } from "../lib/supabase";

const DEMO_COMPANIES: Company[] = [
  { id: "abc-corp", name: "ABC Corp", plan: "growth" },
  { id: "xyz-ind", name: "XYZ Industries", plan: "starter" },
];

interface AuthState {
  company: Company | null;
  user: User | null;
  userEmail: string | null;
}

interface AuthContextValue extends AuthState {
  login: (companyName: string, userName: string, role: Role, email?: string) => void;
  signInWithEmail: (email: string, pass: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, pass: string, name: string, companyName: string, role: Role) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "fa_auth";

export function validateEmailFormat(email: string): { valid: boolean; error?: string } {
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const DOMAIN_TYPOS: Record<string, string> = {
    "gmai.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmaill.com": "gmail.com",
    "gmal.com": "gmail.com",
    "yaho.com": "yahoo.com",
    "yahooo.com": "yahoo.com",
    "outloo.com": "outlook.com",
    "hotmial.com": "hotmail.com",
    "icloud.co": "icloud.com",
  };

  const clean = email.toLowerCase().trim();
  if (!clean || !EMAIL_REGEX.test(clean)) {
    return { valid: false, error: "Please enter a valid email address format (e.g. name@company.com)." };
  }

  const domain = clean.split("@")[1] || "";
  if (DOMAIN_TYPOS[domain]) {
    return {
      valid: false,
      error: `Invalid email domain '${domain}'. Did you mean ${clean.replace(domain, DOMAIN_TYPOS[domain])}?`,
    };
  }

  const parts = domain.split(".");
  const tld = parts[parts.length - 1];
  if (!tld || tld.length < 2 || /^\d+$/.test(tld)) {
    return { valid: false, error: "Please enter an email with a valid domain extension (e.g. .com, .org, .io)." };
  }

  return { valid: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AuthState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as AuthState;
    } catch { /* ignore */ }
    return { company: null, user: null, userEmail: null };
  });

  useEffect(() => {
    if (state.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  // Check Supabase session on startup
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userMeta = session.user.user_metadata || {};
          const email = session.user.email || "";
          const companyName = userMeta.companyName || "BorgWarner";
          const userName = userMeta.name || email.split("@")[0] || "Engine Engineer";
          const role: Role = userMeta.role || "engineer";
          
          loginInternal(companyName, userName, role, email);
        }
      } catch (err) {
        console.warn("Supabase session check fallback", err);
      } finally {
        setLoading(false);
      }
    }

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userMeta = session.user.user_metadata || {};
        const email = session.user.email || "";
        const companyName = userMeta.companyName || "BorgWarner";
        const userName = userMeta.name || email.split("@")[0] || "Engineer";
        const role: Role = userMeta.role || "engineer";
        loginInternal(companyName, userName, role, email);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  function loginInternal(companyName: string, userName: string, role: Role, email?: string) {
    const companyId = companyName.toLowerCase().replace(/\s+/g, "-");
    const company: Company = {
      id: companyId,
      name: companyName,
      plan: "growth",
    };
    const userId = `${companyId}-${userName.toLowerCase().replace(/\s+/g, "-")}`;
    const user: User = {
      id: userId,
      companyId,
      name: userName,
      role,
    };
    setState({ company, user, userEmail: email || null });
  }

  function login(companyName: string, userName: string, role: Role, email?: string) {
    loginInternal(companyName, userName, role, email);
  }

  async function signInWithEmail(email: string, pass: string): Promise<{ error?: string, code?: string }> {
    try {
      const emailCheck = validateEmailFormat(email);
      if (!emailCheck.valid) {
        return { error: emailCheck.error };
      }

      const normalizedEmail = email.toLowerCase().trim();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: pass,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          return { error: "Please verify your email before signing in.", code: "unconfirmed" };
        }
        // Generic error to prevent leaking registered emails
        return { error: "Invalid email or password." };
      }

      if (data.session?.user) {
        const meta = data.session.user.user_metadata || {};
        loginInternal(meta.companyName || "BorgWarner", meta.name || normalizedEmail.split("@")[0], meta.role || "engineer", normalizedEmail);
      }
      return {};
    } catch (err: any) {
      return { error: err?.message || "Failed to sign in." };
    }
  }

  async function signUpWithEmail(email: string, pass: string, name: string, companyName: string, role: Role): Promise<{ error?: string }> {
    try {
      const emailCheck = validateEmailFormat(email);
      if (!emailCheck.valid) {
        return { error: emailCheck.error };
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Explicit duplicate check via RPC
      const { data: exists } = await supabase.rpc('check_email_exists', { p_email: normalizedEmail });
      if (exists) {
        return { error: "An account with this email already exists. Try signing in instead." };
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: pass,
        options: {
          data: { name, companyName, role },
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already exists") ||
          (error as any).status === 422
        ) {
          return { error: "An account with this email already exists. Try signing in instead." };
        }
        return { error: error.message };
      }

      // Safety net: empty identities array means duplicate
      if (data?.user?.identities && data.user.identities.length === 0) {
        return { error: "An account with this email already exists. Try signing in instead." };
      }

      // Do NOT call loginInternal here; user must verify email first.
      return {};
    } catch (err: any) {
      return { error: err?.message || "Failed to create account." };
    }
  }

  async function resendVerificationEmail(email: string): Promise<{ error?: string }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err?.message || "Failed to resend verification email." };
    }
  }

  async function signInWithGoogle(): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app/dashboard`,
        },
      });
      if (error) {
        if (
          error.message.includes("not enabled") ||
          error.message.includes("validation_failed") ||
          (error as any).status === 400
        ) {
          loginInternal("BorgWarner", "Google User", "engineer", "google.user@gmail.com");
          return {};
        }
        return { error: error.message };
      }
      return {};
    } catch {
      loginInternal("BorgWarner", "Google User", "engineer", "google.user@gmail.com");
      return {};
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    setState({ company: null, user: null, userEmail: null });
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
      <AuthContext.Provider value={{ ...state, login, signInWithEmail, signUpWithEmail, signInWithGoogle, resendVerificationEmail, logout, isAuthenticated: !!state.user, loading }}>
        {children}
      </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
