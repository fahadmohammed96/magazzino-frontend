"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

/**
 * Protegge le rotte interne: mostra il contenuto solo a sessione autenticata.
 * Mentre la sessione è in verifica rende un indicatore di caricamento; se non
 * autenticata reindirizza al login e non rende nulla (evita il flash del
 * contenuto protetto).
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen items-center justify-center px-4 text-sm text-muted"
      >
        {status === "loading"
          ? "Verifica della sessione…"
          : "Reindirizzamento al login…"}
      </div>
    );
  }

  return <>{children}</>;
}
