import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "[NOME PROGETTO]",
  description:
    "[PLACEHOLDER] Descrizione del salone: servizi, dove siamo, contatti.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className="bg-surface text-surface-contrast font-body antialiased">
        {children}
      </body>
    </html>
  );
}
