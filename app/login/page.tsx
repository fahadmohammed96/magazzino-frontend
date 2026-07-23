import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Accedi — Magazzino" };

/**
 * Pagina pubblica di accesso. Fuori dalla shell interna (nessuna
 * navigazione): solo il marchio e il form, centrati.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section
        aria-labelledby="titolo-login"
        className="w-full max-w-sm rounded-[var(--radius-card)] border border-border bg-surface-muted p-8 shadow-sm"
      >
        <header className="mb-6 flex flex-col gap-1">
          <span className="font-display text-base font-semibold tracking-tight text-surface-contrast">
            Magazzino
          </span>
          <h1
            id="titolo-login"
            className="font-display text-2xl font-semibold tracking-tight"
          >
            Accedi
          </h1>
          <p className="text-sm text-muted">
            Inserisci le tue credenziali per accedere al gestionale.
          </p>
        </header>

        <LoginForm />
      </section>
    </main>
  );
}
