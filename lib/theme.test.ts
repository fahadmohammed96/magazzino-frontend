import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  resolveInitialTheme,
  setTheme,
  THEME_STORAGE_KEY,
} from "./theme";

/** Imposta la risposta di matchMedia per (prefers-color-scheme: dark). */
function mockPrefersDark(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches } as MediaQueryList),
  );
}

describe("theme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getStoredTheme", () => {
    it("restituisce null senza scelta salvata", () => {
      expect(getStoredTheme()).toBeNull();
    });

    it("restituisce il tema salvato", () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
      expect(getStoredTheme()).toBe("dark");
    });

    it("ignora valori non validi", () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, "solarized");
      expect(getStoredTheme()).toBeNull();
    });
  });

  describe("getSystemTheme", () => {
    it("segue prefers-color-scheme: dark", () => {
      mockPrefersDark(true);
      expect(getSystemTheme()).toBe("dark");
    });

    it("default a light quando il sistema non preferisce il buio", () => {
      mockPrefersDark(false);
      expect(getSystemTheme()).toBe("light");
    });
  });

  describe("resolveInitialTheme", () => {
    it("privilegia la scelta salvata sulla preferenza di sistema", () => {
      mockPrefersDark(true);
      window.localStorage.setItem(THEME_STORAGE_KEY, "light");
      expect(resolveInitialTheme()).toBe("light");
    });

    it("ricade sulla preferenza di sistema senza scelta salvata", () => {
      mockPrefersDark(true);
      expect(resolveInitialTheme()).toBe("dark");
    });
  });

  describe("applyTheme", () => {
    it("aggiunge la classe .dark in tema scuro", () => {
      applyTheme("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("rimuove la classe .dark in tema chiaro", () => {
      document.documentElement.classList.add("dark");
      applyTheme("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("setTheme", () => {
    it("applica e persiste la scelta", () => {
      setTheme("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    });
  });
});
