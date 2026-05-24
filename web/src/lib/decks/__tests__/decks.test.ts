import { describe, it, expect } from "vitest";
import {
  makeInvestorPitchDeck,
  makeBlankDeck,
  defaultSlideForKind,
  slideOutlineLabel,
  SLIDE_PALETTE_GROUPS,
  type SlideKind,
} from "@/lib/mock/decks";

describe("makeInvestorPitchDeck", () => {
  it("produces exactly 17 slides modeled on the reference PDF", () => {
    const d = makeInvestorPitchDeck({ year: 2024 });
    expect(d.slides).toHaveLength(17);
  });

  it("starts with a cover and ends with a contact slide", () => {
    const d = makeInvestorPitchDeck({ year: 2024 });
    expect(d.slides[0].kind).toBe("cover");
    expect(d.slides[d.slides.length - 1].kind).toBe("contact");
  });

  it("every slide carries the seeded year as dataYear", () => {
    const d = makeInvestorPitchDeck({ year: 2024 });
    for (const s of d.slides) expect(s.dataYear).toBe(2024);
  });

  it("is marked as a shared template deck", () => {
    expect(makeInvestorPitchDeck({ year: 2024 }).isShared).toBe(true);
  });

  it("uses the Florești SIRUTA as the primary location", () => {
    expect(makeInvestorPitchDeck({ year: 2024 }).locationSiruta).toBe("57706");
  });
});

describe("makeBlankDeck", () => {
  it("contains 2 slides (cover + text)", () => {
    const d = makeBlankDeck({ year: 2024 });
    expect(d.slides).toHaveLength(2);
    expect(d.slides[0].kind).toBe("cover");
    expect(d.slides[1].kind).toBe("text");
  });

  it("is not shared", () => {
    expect(makeBlankDeck({ year: 2024 }).isShared).toBe(false);
  });
});

describe("defaultSlideForKind", () => {
  it("covers every kind in the SLIDE_PALETTE_GROUPS table", () => {
    const allKinds = SLIDE_PALETTE_GROUPS.flatMap((g) => g.kinds);
    expect(new Set(allKinds).size).toBe(15);
    for (const kind of allKinds as SlideKind[]) {
      const s = defaultSlideForKind(kind, { year: 2024, locationSiruta: "57706" });
      expect(s.kind).toBe(kind);
      expect(s.dataYear).toBe(2024);
    }
  });
});

describe("slideOutlineLabel", () => {
  it("returns a non-empty label for every kind", () => {
    const allKinds = SLIDE_PALETTE_GROUPS.flatMap((g) => g.kinds) as SlideKind[];
    for (const kind of allKinds) {
      const s = defaultSlideForKind(kind, { year: 2024, locationSiruta: "57706" });
      expect(slideOutlineLabel(s).length).toBeGreaterThan(0);
    }
  });
});
