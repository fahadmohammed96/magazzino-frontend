import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Smonta ciò che ogni test renderizza: senza `globals: true` React Testing
// Library non registra la pulizia da sola, e i render si accumulerebbero
// nel DOM condiviso tra i test dello stesso file.
afterEach(() => {
  cleanup();
});
