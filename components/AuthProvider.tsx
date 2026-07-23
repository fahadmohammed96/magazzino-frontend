"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { configureApiAuth } from "@/lib/api-client";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  type AuthUser,
} from "@/lib/auth";
import { fetchMe, login as loginRequest } from "@/lib/auth-api";

/** Stato della sessione: in verifica, autenticata o non autenticata. */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/** API di autenticazione esposta ai componenti tramite {@link useAuth}. */
export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /**
   * Autentica con le credenziali; su successo salva token e utente e passa a
   * `authenticated`. Propaga l'`ApiError` (es. 401) al chiamante per mostrarlo.
   */
  login: (username: string, password: string) => Promise<void>;
  /** Cancella la sessione e reindirizza alla pagina di login. */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Provider di sessione. Al mount registra token e handler 401 sul client API,
 * poi ripristina la sessione validando l'eventuale token salvato via
 * `/v1/auth/me`. È l'unico proprietario dello stato di autenticazione.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  // Riferimento stabile al reset di sessione: lo usano sia il logout esplicito
  // sia l'handler 401 registrato sul client API, senza ricrearli a ogni render.
  const clearSession = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const logout = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [clearSession, router]);

  // Handler 401 sempre aggiornato tramite ref: `configureApiAuth` viene
  // registrato una sola volta, ma deve chiamare l'ultimo `logout` disponibile.
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    configureApiAuth({
      getToken: getStoredToken,
      onUnauthorized: () => logoutRef.current(),
    });

    const token = getStoredToken();
    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    let active = true;
    fetchMe()
      .then((me) => {
        if (!active) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        // Token assente/invalido: `apiFetch` ha già innescato l'handler 401 su
        // sessione scaduta; qui garantiamo comunque lo stato non autenticato.
        if (!active) return;
        clearStoredToken();
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await loginRequest({ username, password });
      setStoredToken(result.access_token);
      setUser(result.user);
      setStatus("authenticated");
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Accesso allo stato di autenticazione. Deve essere usato sotto
 * {@link AuthProvider}, altrimenti solleva un errore esplicito.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth deve essere usato all'interno di <AuthProvider>.");
  }
  return context;
}
