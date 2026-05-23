"use client";

import { SUGGESTED_PROMPTS } from "@/lib/mock/chat";

type Props = {
  onPick: (prompt: string) => void;
};

export function SuggestedPrompts({ onPick }: Props) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {SUGGESTED_PROMPTS.map((p) => (
        <li key={p}>
          <button
            type="button"
            onClick={() => onPick(p)}
            className="font-body-sm text-body-sm w-full rounded border border-border-subtle bg-surface-container-lowest p-3 text-left transition-colors hover:border-primary hover:text-primary-deep"
          >
            {p}
          </button>
        </li>
      ))}
    </ul>
  );
}
