"use client";

import { Plus, Trash2 } from "lucide-react";
import { type Conversation } from "@/lib/mock/chat";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
};

function bucketLabel(updatedAt: number, now: number): string {
  const days = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return "This week";
  return "Older";
}

export function ConversationList({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
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
                <li key={c.id} className="group relative flex items-center">
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-current={c.id === activeId ? "true" : undefined}
                    className={
                      "font-body-sm text-body-sm min-w-0 flex-1 truncate rounded py-2 pl-3 pr-8 text-left transition-colors " +
                      (c.id === activeId
                        ? "bg-primary/10 font-semibold text-primary-deep"
                        : "text-on-surface hover:bg-surface-muted")
                    }
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    title="Delete conversation"
                    className="absolute right-1 rounded p-1 text-on-surface-variant opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
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
