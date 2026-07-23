import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";
import { NAV_SECTIONS } from "@/lib/navigation";

const section = NAV_SECTIONS.find((s) => s.slug === "clienti")!;

export const metadata: Metadata = { title: `${section.label} — Magazzino` };

export default function ClientiPage() {
  return (
    <SectionPlaceholder
      title={section.label}
      description={section.description}
    />
  );
}
