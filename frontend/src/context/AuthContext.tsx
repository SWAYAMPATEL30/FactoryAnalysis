import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Company, Role, User } from "../types/models";

const DEMO_COMPANIES: Company[] = [
  { id: "abc-corp", name: "ABC Corp", plan: "growth" },
  { id: "xyz-ind", name: "XYZ Industries", plan: "starter" },
];

interface AuthState {
  company: Company | null;
  user: User | null;
}

interface AuthContextValue extends AuthState {
  login: (companyName: string, userName: string, role: Role) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "fa_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as AuthState;
    } catch { /* ignore */ }
    return { company: null, user: null };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function login(companyName: string, userName: string, role: Role) {
    // Find existing demo company or create a new one
    const existing = DEMO_COMPANIES.find(
      (c) => c.name.toLowerCase() === companyName.toLowerCase()
    );
    const company: Company = existing ?? {
      id: companyName.toLowerCase().replace(/\s+/g, "-"),
      name: companyName,
      plan: "starter",
    };
    const user: User = {
      id: `${company.id}-${userName.toLowerCase().replace(/\s+/g, "-")}`,
      companyId: company.id,
      name: userName,
      role,
    };
    setState({ company, user });
  }

  function logout() {
    setState({ company: null, user: null });
  }

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, isAuthenticated: !!state.user }}
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
