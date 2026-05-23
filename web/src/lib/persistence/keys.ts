/**
 * Centralised localStorage key names. All app keys MUST go through here
 * so we never collide with another app on the same origin and so a
 * future "reset everything" button can iterate this object.
 */

export const STORAGE_KEYS = {
  templates: "innoinvest:templates",
  reports: "innoinvest:reports",
  chats: "innoinvest:chats",
  activeChat: "innoinvest:active-chat",
  dataColumnOrder: "innoinvest:data-column-order",
  systemYear: "innoinvest:system-year",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
