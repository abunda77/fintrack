import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, UNAUTHORIZED_EVENT } from "@/lib/api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [username, setUsername] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const markUnauthenticated = useCallback(() => {
    setUsername(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await api.getSession();
        if (!active) return;
        setUsername(session.username);
        setStatus(session.authenticated ? "authenticated" : "unauthenticated");
      } catch {
        if (!active) return;
        setUsername(null);
        setStatus("unauthenticated");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, markUnauthenticated);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, markUnauthenticated);
  }, [markUnauthenticated]);

  const login = useCallback(async (user: string, password: string) => {
    const session = await api.login({ username: user, password });
    setUsername(session.username);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      markUnauthenticated();
    }
  }, [markUnauthenticated]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, username, login, logout }),
    [status, username, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  return ctx;
}
