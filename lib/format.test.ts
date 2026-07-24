import { describe, expect, it } from "vitest";
import { formatPrice } from "./format";

// Il separatore che Intl inserisce tra numero e simbolo varia con la versione
// ICU (spazio insecabile U+00A0 o stretto U+202F): normalizziamo gli spazi per
// non legare il test a un dettaglio d'ambiente.
const normalize = (value: string) => value.replace(/\s/g, " ");

describe("formatPrice", () => {
  it("formatta un prezzo in euro con locale it-IT (virgola, due decimali)", () => {
    expect(normalize(formatPrice(12.5))).toBe("12,50 €");
  });

  it("mostra due decimali anche per interi", () => {
    expect(normalize(formatPrice(4))).toBe("4,00 €");
  });

  it("rende un trattino per valori non finiti", () => {
    expect(formatPrice(Number.NaN)).toBe("—");
    expect(formatPrice(Number.POSITIVE_INFINITY)).toBe("—");
  });
});
