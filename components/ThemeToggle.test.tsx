import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false } as MediaQueryList),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parte dal tema chiaro e passa a scuro al click, persistendo la scelta", () => {
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /tema scuro/i });
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    fireEvent.click(button);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(
      screen.getByRole("button", { name: /tema chiaro/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("torna al tema chiaro con un secondo click", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    fireEvent.click(button);
    fireEvent.click(button);

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
