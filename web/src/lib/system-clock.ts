/**
 * Demo "system year" that controls which observations are considered
 * current. Used by /reports to power the regenerate-with-fresh-data
 * workflow without a real backend.
 *
 * The default is 2024 (matches the seeded narrative); 2025–2027 are
 * available via the SystemClock UI. Persisted in localStorage so the
 * demo state survives reloads.
 */

import { readStorage, writeStorage } from "./persistence/storage";
import { STORAGE_KEYS } from "./persistence/keys";
import { YEARS_AVAILABLE } from "./mock/observations";

export const DEFAULT_SYSTEM_YEAR = 2024;

export function getSystemYear(): number {
  const stored = readStorage<number>(STORAGE_KEYS.systemYear, DEFAULT_SYSTEM_YEAR);
  if (YEARS_AVAILABLE.includes(stored)) return stored;
  return DEFAULT_SYSTEM_YEAR;
}

export function setSystemYear(year: number): void {
  if (!YEARS_AVAILABLE.includes(year)) return;
  writeStorage(STORAGE_KEYS.systemYear, year);
}

/** Years the user can jump to in the UI (current and future only). */
export function selectableYears(now: number = DEFAULT_SYSTEM_YEAR): number[] {
  return YEARS_AVAILABLE.filter((y) => y >= now);
}
