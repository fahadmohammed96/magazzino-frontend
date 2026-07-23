import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LowStockBadge } from "./LowStockBadge";

describe("LowStockBadge", () => {
  it("comunica lo stato sotto-scorta con testo, non col solo colore", () => {
    render(<LowStockBadge />);
    expect(screen.getByText(/sotto scorta/i)).toBeInTheDocument();
  });
});
