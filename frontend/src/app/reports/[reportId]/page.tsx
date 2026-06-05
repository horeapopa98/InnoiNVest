"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import { readStorage } from "@/lib/persistence/storage";
import { SlideRenderer } from "@/components/reports/deck/renderers/SlideRenderer";
import type { Deck } from "@/lib/mock/decks";
import "@/components/reports/chrome/deck-print.css";

export default function DeckPreviewPage() {
  const params = useParams<{ reportId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const decks = readStorage<Deck[]>(STORAGE_KEYS.decks, []);
    setDeck(decks.find((d) => d.id === params.reportId) ?? null);
    setHydrated(true);
  }, [params.reportId]);

  if (!hydrated) return <div className="p-8 text-on-surface-variant">Loading…</div>;
  if (!deck) return <div className="p-8 text-on-surface-variant">Deck not found.</div>;

  return (
    <>
      {/* Floating print bar — hidden in print via deck-print.css */}
      <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-surface-container px-4 py-2 shadow ring-1 ring-border-subtle no-print">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-sm font-medium text-on-surface hover:text-primary-deep"
        >
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <main className="deck-print-root mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-12">
        {deck.slides.map((slide, i) => (
          <SlideRenderer
            key={slide.id}
            slide={slide}
            deck={deck}
            page={i + 1}
            total={deck.slides.length}
            readOnly
          />
        ))}
      </main>
    </>
  );
}
