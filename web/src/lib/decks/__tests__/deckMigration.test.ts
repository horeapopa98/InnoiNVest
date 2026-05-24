import { describe, it, expect, beforeEach } from "vitest";
import { runDeckMigration } from "@/lib/decks/deckMigration";
import { STORAGE_KEYS } from "@/lib/persistence/keys";

describe("runDeckMigration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("seeds an Investor Pitch deck when no innoinvest:decks key is present", () => {
    runDeckMigration(2024);
    const raw = window.localStorage.getItem(STORAGE_KEYS.decks);
    expect(raw).not.toBeNull();
    const decks = JSON.parse(raw!);
    expect(decks).toHaveLength(1);
    expect(decks[0].templateOrigin).toBe("investor-pitch");
    expect(window.localStorage.getItem(STORAGE_KEYS.activeDeck)).toBe(decks[0].id);
  });

  it("is a no-op when innoinvest:decks already exists", () => {
    window.localStorage.setItem(STORAGE_KEYS.decks, JSON.stringify([{ id: "existing" }]));
    runDeckMigration(2024);
    const raw = window.localStorage.getItem(STORAGE_KEYS.decks);
    expect(JSON.parse(raw!)).toEqual([{ id: "existing" }]);
  });

  it("clears the legacy innoinvest:templates and innoinvest:reports keys on first run", () => {
    window.localStorage.setItem("innoinvest:templates", "[]");
    window.localStorage.setItem("innoinvest:reports", "[]");
    runDeckMigration(2024);
    expect(window.localStorage.getItem("innoinvest:templates")).toBeNull();
    expect(window.localStorage.getItem("innoinvest:reports")).toBeNull();
  });
});
