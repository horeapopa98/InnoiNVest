"use client";

import { SlotDropZone } from "./SlotDropZone";
import { type SectionConfig } from "@/lib/mock/templates";

type Props = {
  section: SectionConfig;
  onClearSlot: (slotId: string) => void;
};

export function SectionBlock({ section, onClearSlot }: Props) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">{section.title}</h2>
        <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          {section.kind.replace("_", " ")}
        </span>
      </header>
      <div className="space-y-3">
        {section.slots.map((slot) => (
          <SlotDropZone key={slot.id} slot={slot} onClear={() => onClearSlot(slot.id)} />
        ))}
      </div>
    </section>
  );
}
