"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
};

type AuthState = {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refresh: () => Promise<void>;
  signOut: (callbackUrl?: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const payload = await res.json();
    setUser(payload.user ?? null);
    setStatus(payload.user ? "authenticated" : "unauthenticated");
  }

  async function signOut(callbackUrl = "/") {
    setStatus("loading");
    await supabase.auth.signOut();
    window.location.href = callbackUrl;
  }

  useEffect(() => {
    refresh();
    const { data } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
