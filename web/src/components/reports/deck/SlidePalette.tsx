"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  SLIDE_KIND_LABELS,
  SLIDE_PALETTE_GROUPS,
  type SlideKind,
} from "@/lib/mock/decks";

type Props = {
  onPick: (kind: SlideKind) => void;
};

export function SlidePalette({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex w-full items-center justify-center gap-1 rounded border border-dashed border-border-subtle px-2 py-2 text-xs text-on-surface-variant transition-colors hover:border-primary hover:text-primary-deep"
      >
        <Plus size={14} /> Add slide
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-96 overflow-y-auto rounded border border-border-subtle bg-surface-container-lowest p-2 shadow-lg">
          {SLIDE_PALETTE_GROUPS.map((g) => (
            <div key={g.label} className="mb-2 last:mb-0">
              <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                {g.label}
              </p>
              <ul className="flex flex-col">
                {g.kinds.map((k) => (
                  <li key={k}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(k);
                        setOpen(false);
                      }}
                      className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-surface-container"
                    >
                      {SLIDE_KIND_LABELS[k]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
