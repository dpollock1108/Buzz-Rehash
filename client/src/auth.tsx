import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { devLogin, getAuthInfo, logout } from "./api/client";
import type { AuthInfo, User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  oidcConfigured: boolean;
  devLoginAllowed: boolean;
  signInWithSso: () => void;
  signInDev: (name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<AuthInfo>({
    user: null,
    oidcConfigured: false,
    devLoginAllowed: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthInfo()
      .then(setInfo)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const signInWithSso = useCallback(() => {
    window.location.href = "/api/auth/login";
  }, []);

  const signInDev = useCallback(async (name?: string) => {
    const { user } = await devLogin(name);
    setInfo((prev) => ({ ...prev, user }));
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setInfo((prev) => ({ ...prev, user: null }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: info.user,
        loading,
        oidcConfigured: info.oidcConfigured,
        devLoginAllowed: info.devLoginAllowed,
        signInWithSso,
        signInDev,
        signOut,
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
