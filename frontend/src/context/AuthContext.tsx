import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Company, Role, User } from "../types/models";
import { supabase } from "../lib/supabase";

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
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "fa_auth";
const USERS_DB_KEY = "fa_registered_users";

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

  async function signInWithEmail(email: string, pass: string): Promise<{ error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        // Local credential validation fallback if Supabase project keys are in anon setup
        const localUsersRaw = localStorage.getItem(USERS_DB_KEY);
        if (localUsersRaw) {
          const registered = JSON.parse(localUsersRaw) as Record<string, { pass: string; name: string; companyName: string; role: Role }>;
          const found = registered[email.toLowerCase()];
          if (found) {
            if (found.pass === pass) {
              loginInternal(found.companyName, found.name, found.role, email);
              return {};
            }
            return { error: "Invalid password for this email address." };
          }
        }
        return { error: error.message || "Invalid credentials." };
      }

      if (data.session?.user) {
        const meta = data.session.user.user_metadata || {};
        loginInternal(meta.companyName || "BorgWarner", meta.name || email.split("@")[0], meta.role || "engineer", email);
      }
      return {};
    } catch (err: any) {
      return { error: err?.message || "Failed to sign in." };
    }
  }

  async function signUpWithEmail(email: string, pass: string, name: string, companyName: string, role: Role): Promise<{ error?: string }> {
    try {
      // Save locally to guarantee persistence across browser reloads
      const localUsersRaw = localStorage.getItem(USERS_DB_KEY);
      const registered = localUsersRaw ? JSON.parse(localUsersRaw) : {};
      registered[email.toLowerCase()] = { pass, name, companyName, role };
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(registered));

      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { name, companyName, role },
        },
      });

      if (error && !data?.user) {
        // Fallback login with stored credentials
        loginInternal(companyName, name, role, email);
        return {};
      }

      loginInternal(companyName, name, role, email);
      return {};
    } catch (err: any) {
      // Fallback
      loginInternal(companyName, name, role, email);
      return {};
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
        return { error: error.message };
      }
      return {};
    } catch (err: any) {
      return { error: err?.message || "Google OAuth initialization failed." };
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
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        logout,
        isAuthenticated: !!state.user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
