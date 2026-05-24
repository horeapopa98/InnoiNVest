import { describe, it, expect } from "vitest";
import { countyNarrative, cityNarrative, communeCallout } from "@/lib/decks/autoNarrative";

describe("autoNarrative", () => {
  it("countyNarrative returns a non-empty string mentioning the location name", () => {
    const out = countyNarrative({ siruta: "120", year: 2024 });
    expect(out.length).toBeGreaterThan(20);
    expect(out).toMatch(/Cluj/);
  });

  it("cityNarrative returns three paragraphs", () => {
    const paragraphs = cityNarrative({ siruta: "54975", year: 2024 });
    expect(paragraphs).toHaveLength(3);
    paragraphs.forEach((p) => expect(p.length).toBeGreaterThan(10));
  });

  it("communeCallout cites the commune name", () => {
    const out = communeCallout({ siruta: "57706", year: 2024 });
    expect(out).toMatch(/Florești/);
  });

  it("returns sensible fallbacks for unknown SIRUTA", () => {
    expect(countyNarrative({ siruta: "999999", year: 2024 })).toMatch(/region/i);
  });
});
