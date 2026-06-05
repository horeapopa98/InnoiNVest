/**
 * Typed wrapper over localStorage. Safe to call from server components
 * (returns the fallback) and from event handlers. JSON-encoded values
 * only — if a key needs raw strings, use localStorage directly.
 */

import { type StorageKey } from "./keys";

export function readStorage<T>(key: StorageKey, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: StorageKey, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded / serialisation failure — silently drop. Persistence
    // is a nice-to-have for the demo, not load-bearing.
  }
}

export function clearStorage(key: StorageKey): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}
