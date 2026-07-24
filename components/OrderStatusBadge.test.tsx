import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/orders-api";

describe("OrderStatusBadge", () => {
  it("mostra l'etichetta leggibile di ogni stato (non affidata al solo colore)", () => {
    for (const status of ORDER_STATUSES) {
      const { unmount } = render(<OrderStatusBadge status={status} />);
      expect(screen.getByText(STATUS_LABELS[status])).toBeInTheDocument();
      unmount();
    }
  });

  it("usa il rosso semantico a fondo pieno per lo stato annullato", () => {
    render(<OrderStatusBadge status="annullato" />);
    const badge = screen.getByText(STATUS_LABELS.annullato);
    expect(badge.className).toContain("bg-danger");
    expect(badge.className).toContain("text-danger-contrast");
  });
});
