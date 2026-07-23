import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";
import { NAV_SECTIONS } from "@/lib/navigation";

const section = NAV_SECTIONS.find((s) => s.slug === "catalogo")!;

export const metadata: Metadata = { title: `${section.label} — Magazzino` };

export default function CatalogoPage() {
  return (
    <SectionPlaceholder
      title={section.label}
      description={section.description}
    />
  );
}
