import { describe, it, expect } from "vitest";
import { slideFromAssistantBlocks } from "@/lib/decks/createSlideFromChat";
import type { AssistantBlock } from "@/lib/mock/chat";

const ctx = { activeDeckLocation: "57706", activeDeckYear: 2024 };

describe("slideFromAssistantBlocks", () => {
  it("maps scorecard for a county into a county_snapshot slide", () => {
    const blocks: AssistantBlock[] = [
      { kind: "scorecard", locationSiruta: "120", year: 2024, tiles: [] },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("county_snapshot");
  });

  it("maps scorecard for a city into a city_snapshot slide", () => {
    const blocks: AssistantBlock[] = [
      { kind: "scorecard", locationSiruta: "54975", year: 2024, tiles: [] },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("city_snapshot");
  });

  it("maps a single-series lineChart to a trend slide", () => {
    const blocks: AssistantBlock[] = [
      {
        kind: "lineChart",
        kpiCode: "gdp_per_capita",
        yearRange: [2018, 2024],
        series: [{ locationSiruta: "120", points: [{ year: 2018, value: 1 }] }],
      },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("trend");
  });

  it("maps a multi-series lineChart to a comparison slide", () => {
    const blocks: AssistantBlock[] = [
      {
        kind: "lineChart",
        kpiCode: "wage_avg",
        yearRange: [2018, 2024],
        series: [
          { locationSiruta: "120", points: [] },
          { locationSiruta: "63", points: [] },
        ],
      },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("comparison");
  });

  it("maps metricCard to a stat_infographic slide", () => {
    const blocks: AssistantBlock[] = [
      {
        kind: "metricCard",
        locationSiruta: "120",
        kpiCode: "gdp_per_capita",
        year: 2024,
        value: 17000,
        regionAvg: null,
        series: [],
      },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("stat_infographic");
  });

  it("maps parcelMap to a parcel_detail slide using the first parcel id", () => {
    const blocks: AssistantBlock[] = [
      { kind: "parcelMap", filterType: "all", parcelIds: ["p-cluj-floresti", "p-cluj-jucu"] },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("parcel_detail");
    if (s.kind === "parcel_detail") expect(s.parcelId).toBe("p-cluj-floresti");
  });

  it("maps interactiveRecommendation to a recommendation slide preserving sector", () => {
    const blocks: AssistantBlock[] = [
      { kind: "interactiveRecommendation", sector: "manufacturing", year: 2024 },
    ];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("recommendation");
    if (s.kind === "recommendation") expect(s.sector).toBe("manufacturing");
  });

  it("falls back to a text slide when no recognised block is present", () => {
    const blocks: AssistantBlock[] = [{ kind: "text", text: "Hello world" }];
    const s = slideFromAssistantBlocks(blocks, ctx);
    expect(s.kind).toBe("text");
    if (s.kind === "text") expect(s.paragraphs.join("\n")).toContain("Hello world");
  });
});
