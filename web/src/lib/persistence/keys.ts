/**
 * Centralised localStorage key names. All app keys MUST go through here
 * so we never collide with another app on the same origin and so a
 * future "reset everything" button can iterate this object.
 */

export const STORAGE_KEYS = {
  decks: "innoinvest:decks",
  activeDeck: "innoinvest:active-deck",
  chats: "innoinvest:chats",
  activeChat: "innoinvest:active-chat",
  dataColumnOrder: "innoinvest:data-column-order",
  systemYear: "innoinvest:system-year",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
