import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
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
        {/* La shell dell'area interna vive nel gruppo di rotte protette
            (`app/(protected)`); il login resta fuori dalla shell. Qui sopra
            tutto c'è solo il provider di sessione. */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
