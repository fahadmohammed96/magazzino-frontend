import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { NO_FLASH_THEME_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Magazzino — Gestione ordini",
  description:
    "Dashboard interna per la gestione di catalogo, clienti e ordini di magazzino.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Applica il tema prima dell'idratazione per evitare il flash. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="bg-surface text-surface-contrast font-body antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
