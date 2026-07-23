"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";

/** Destinazione dopo un login riuscito (o se già autenticati). */
const AFTER_LOGIN = "/";

/**
 * Form di accesso: username/password → `/v1/auth/login`. Su successo salva il
 * token (via `AuthProvider`) e reindirizza alla dashboard. Su credenziali
 * errate mostra il messaggio del backend senza perdere l'input.
 */
export function LoginForm() {
  const { status, login } = useAuth();
  const router = useRouter();
  const usernameId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Chi è già autenticato (o lo diventa) non resta sul login.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(AFTER_LOGIN);
    }
  }, [status, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    // Il form usa `noValidate` (niente tooltip nativi del browser): validiamo
    // qui i campi obbligatori, così un submit a vuoto non parte come richiesta
    // di rete ma mostra subito il messaggio in pagina.
    if (username.trim() === "" || password === "") {
      setError("Inserisci nome utente e password.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      router.replace(AFTER_LOGIN);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : "Accesso non riuscito. Riprova.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={usernameId} className="text-sm font-medium">
          Nome utente
        </label>
        <input
          id={usernameId}
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          disabled={submitting}
          className="rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-sm text-surface-contrast transition-colors duration-200 focus-visible:border-accent disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={passwordId} className="text-sm font-medium">
          Password
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          disabled={submitting}
          className="rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-sm text-surface-contrast transition-colors duration-200 focus-visible:border-accent disabled:opacity-60"
        />
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="rounded-[var(--radius-card)] border border-border bg-surface-muted px-3 py-2 text-sm text-surface-contrast"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-10 items-center justify-center rounded-[var(--radius-card)] bg-primary px-4 text-sm font-medium text-primary-contrast transition-colors duration-200 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Accesso in corso…" : "Accedi"}
      </button>
    </form>
  );
}
