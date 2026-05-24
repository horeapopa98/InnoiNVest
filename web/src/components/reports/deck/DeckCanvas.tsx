"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Share2 } from "lucide-react";
import { SlideRenderer } from "./renderers/SlideRenderer";
import type { Deck, Slide } from "@/lib/mock/decks";

type Props = {
  deck: Deck;
  slide: Slide;
  onChangeDeck: (deck: Deck) => void;
  onSelectSlide: (id: string) => void;
  onRequestRename: () => void;
};

export function DeckCanvas({ deck, slide, onChangeDeck, onSelectSlide, onRequestRename }: Props) {
  const router = useRouter();
  const idx = deck.slides.findIndex((s) => s.id === slide.id);
  const total = deck.slides.length;

  function patchSlide(patch: Partial<Slide>) {
    onChangeDeck({
      ...deck,
      updatedAt: Date.now(),
      slides: deck.slides.map((s) => (s.id === slide.id ? ({ ...s, ...patch } as Slide) : s)),
    });
  }

  function prev() {
    if (idx > 0) onSelectSlide(deck.slides[idx - 1].id);
  }
  function next() {
    if (idx < total - 1) onSelectSlide(deck.slides[idx + 1].id);
  }

  function copyShareUrl() {
    const url = `${window.location.origin}/reports/${deck.id}`;
    navigator.clipboard.writeText(url).catch(() => undefined);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border-subtle bg-surface px-5 py-2">
        <button
          type="button"
          onClick={onRequestRename}
          className="rounded px-1 py-0.5 text-sm font-semibold hover:bg-surface-container"
        >
          {deck.title}
        </button>
        <span className="text-on-surface-variant">·</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary-deep">
          {deck.locationSiruta ? `Location: ${deck.locationSiruta}` : "No location"}
        </span>
        <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
          {deck.systemYear}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/reports/${deck.id}`)}
            className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-xs hover:border-primary hover:text-primary-deep"
          >
            <Download size={12} /> PDF
          </button>
          <button
            type="button"
            onClick={copyShareUrl}
            className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-xs hover:border-primary hover:text-primary-deep"
          >
            <Share2 size={12} /> Share
          </button>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex flex-1 items-center justify-center overflow-auto bg-background p-6">
        <div className="w-full max-w-[1100px]">
          <SlideRenderer
            slide={slide}
            deck={deck}
            page={idx + 1}
            total={total}
            readOnly={false}
            onChange={patchSlide}
          />
        </div>
      </div>

      {/* Footer status */}
      <footer className="flex items-center justify-between border-t border-border-subtle bg-surface px-5 py-2 text-xs text-on-surface-variant">
        <span>
          Slide {idx + 1} of {total} · {slide.kind}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={idx === 0}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-surface-container disabled:opacity-40"
          >
            <ChevronLeft size={12} /> Prev
          </button>
          <button
            type="button"
            onClick={next}
            disabled={idx === total - 1}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-surface-container disabled:opacity-40"
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      </footer>
    </div>
  );
}
