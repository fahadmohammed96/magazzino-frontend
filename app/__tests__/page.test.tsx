import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../page";
import { NAV_SECTIONS } from "@/lib/navigation";

describe("Home (Panoramica)", () => {
  it("mostra il titolo Panoramica", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: /panoramica/i }),
    ).toBeInTheDocument();
  });

  it("elenca le tre sezioni con link alla rispettiva rotta", () => {
    render(<Home />);
    for (const section of NAV_SECTIONS) {
      const link = screen.getByRole("link", { name: new RegExp(section.label, "i") });
      expect(link).toHaveAttribute("href", `/${section.slug}`);
    }
  });
});
