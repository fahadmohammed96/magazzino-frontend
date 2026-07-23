import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_TOKEN_KEY,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "./auth";

describe("auth — storage del token", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("restituisce null senza token salvato", () => {
    expect(getStoredToken()).toBeNull();
  });

  it("persiste e rilegge il token", () => {
    setStoredToken("abc.123");
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBe("abc.123");
    expect(getStoredToken()).toBe("abc.123");
  });

  it("tratta la stringa vuota come assenza di token", () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "");
    expect(getStoredToken()).toBeNull();
  });

  it("rimuove il token al logout", () => {
    setStoredToken("abc.123");
    clearStoredToken();
    expect(getStoredToken()).toBeNull();
  });
});
