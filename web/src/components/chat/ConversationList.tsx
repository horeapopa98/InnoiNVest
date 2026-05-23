"use client";

import { Plus } from "lucide-react";
import { type Conversation } from "@/lib/mock/chat";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
};

function bucketLabel(updatedAt: number, now: number): string {
  const days = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return "This week";
  return "Older";
}

export function ConversationList({ conversations, activeId, onSelect, onNew }: Props) {
  const now = Date.now();
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const buckets = sorted.reduce<Record<string, Conversation[]>>((acc, c) => {
    const k = bucketLabel(c.updatedAt, now);
    (acc[k] ??= []).push(c);
    return acc;
  }, {});

  return (
    <nav aria-label="Conversations" className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <button
        type="button"
        onClick={onNew}
        className="font-label-md text-label-md inline-flex items-center justify-center gap-1 rounded border border-border-subtle px-3 py-2 transition-colors hover:border-primary hover:text-primary-deep"
      >
        <Plus size={14} /> New chat
      </button>
      {["Today", "Yesterday", "This week", "Older"].map((label) => {
        const items = buckets[label];
        if (!items || items.length === 0) return null;
        return (
          <section key={label}>
            <h3 className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
              {label}
            </h3>
            <ul className="space-y-1">
              {items.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-current={c.id === activeId ? "true" : undefined}
                    className={
                      c.id === activeId
                        ? "font-body-sm text-body-sm w-full truncate rounded bg-primary/10 px-3 py-2 text-left font-semibold text-primary-deep"
                        : "font-body-sm text-body-sm w-full truncate rounded px-3 py-2 text-left text-on-surface transition-colors hover:bg-surface-muted"
                    }
                  >
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}
