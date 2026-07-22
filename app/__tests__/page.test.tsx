import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../page";

describe("Home", () => {
  it("mostra il titolo del progetto", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: /nome progetto/i }),
    ).toBeInTheDocument();
  });
});
