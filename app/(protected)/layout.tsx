import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";

/**
 * Layout dell'area interna protetta. Ogni rotta di questo gruppo è accessibile
 * solo a sessione autenticata (`AuthGuard`) e vive dentro la shell con
 * navigazione e header (`AppShell`).
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
