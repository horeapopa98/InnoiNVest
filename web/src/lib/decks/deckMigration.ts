/**
 * One-time localStorage migration helper. Run once on /reports mount.
 *
 * Old schema (template + slot model) is incompatible with the new
 * typed-slide Deck model. There is no upgrade path — the demo restarts
 * cleanly with the seeded Investor Pitch deck.
 */

import { STORAGE_KEYS } from "@/lib/persistence/keys";
import { makeInvestorPitchDeck, type Deck } from "@/lib/mock/decks";

const LEGACY_KEYS = ["innoinvest:templates", "innoinvest:reports"];

export function runDeckMigration(year: number): void {
  if (typeof window === "undefined") return;

  // No-op when the new schema is already present.
  if (window.localStorage.getItem(STORAGE_KEYS.decks) !== null) return;

  // Drop legacy keys (schemas are incompatible).
  for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);

  const seeded: Deck = makeInvestorPitchDeck({ year });
  window.localStorage.setItem(STORAGE_KEYS.decks, JSON.stringify([seeded]));
  window.localStorage.setItem(STORAGE_KEYS.activeDeck, seeded.id);
}
