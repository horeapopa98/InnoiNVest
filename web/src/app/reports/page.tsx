"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopNav } from "@/components/stitch/TopNav";
import { DeckLibrary } from "@/components/reports/deck/DeckLibrary";
import { DeckCanvas } from "@/components/reports/deck/DeckCanvas";
import { EditPanel } from "@/components/reports/deck/EditPanel";
import { SystemClock } from "@/components/reports/SystemClock";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import { readStorage, writeStorage } from "@/lib/persistence/storage";
import { runDeckMigration } from "@/lib/decks/deckMigration";
import {
  defaultSlideForKind,
  type Deck,
  type Slide,
} from "@/lib/mock/decks";

function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <main className="grid flex-1 place-items-center text-on-surface-variant">Loading deck…</main>
    </div>
  );
}

function ReportsEditor() {
  const router = useRouter();
  const search = useSearchParams();
  const slideParam = search.get("slide");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string>("");
  const [activeSlideId, setActiveSlideId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (and run migration if needed).
  useEffect(() => {
    const year = readStorage<number>(STORAGE_KEYS.systemYear, new Date().getFullYear());
    runDeckMigration(year);
    const stored = readStorage<Deck[]>(STORAGE_KEYS.decks, []);
    const activeId = readStorage<string>(STORAGE_KEYS.activeDeck, stored[0]?.id ?? "");
    setDecks(stored);
    setActiveDeckId(activeId);
    const startSlide = slideParam ?? stored.find((d) => d.id === activeId)?.slides[0]?.id ?? "";
    setActiveSlideId(startSlide);
    setHydrated(true);
    // We intentionally only run this on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist deck changes after hydration.
  useEffect(() => {
    if (!hydrated) return;
    writeStorage(STORAGE_KEYS.decks, decks);
  }, [decks, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    writeStorage(STORAGE_KEYS.activeDeck, activeDeckId);
  }, [activeDeckId, hydrated]);

  // Keep `?slide=` in sync with the selected slide.
  useEffect(() => {
    if (!hydrated || !activeSlideId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("slide") !== activeSlideId) {
      url.searchParams.set("slide", activeSlideId);
      router.replace(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
    }
  }, [activeSlideId, hydrated, router]);

  const activeDeck = useMemo(() => decks.find((d) => d.id === activeDeckId), [decks, activeDeckId]);
  const activeSlide = useMemo(
    () => activeDeck?.slides.find((s) => s.id === activeSlideId) ?? activeDeck?.slides[0],
    [activeDeck, activeSlideId]
  );

  function updateDeck(next: Deck) {
    setDecks((cur) => cur.map((d) => (d.id === next.id ? next : d)));
  }
  function createDeck(deck: Deck) {
    setDecks((cur) => [...cur, deck]);
    setActiveDeckId(deck.id);
    setActiveSlideId(deck.slides[0]?.id ?? "");
  }
  function patchSlide(patch: Partial<Slide>) {
    if (!activeDeck || !activeSlide) return;
    updateDeck({
      ...activeDeck,
      updatedAt: Date.now(),
      slides: activeDeck.slides.map((s) =>
        s.id === activeSlide.id ? ({ ...s, ...patch } as Slide) : s
      ),
    });
  }
  function resetSlideToDefaults() {
    if (!activeDeck || !activeSlide) return;
    const ns = defaultSlideForKind(activeSlide.kind, {
      year: activeDeck.systemYear,
      locationSiruta: activeDeck.locationSiruta,
    });
    patchSlide({ ...ns, id: activeSlide.id } as Partial<Slide>);
  }
  function renameActiveDeck() {
    if (!activeDeck) return;
    const next = window.prompt("Deck title", activeDeck.title);
    if (next && next.trim().length > 0) updateDeck({ ...activeDeck, title: next.trim(), updatedAt: Date.now() });
  }

  if (!hydrated || !activeDeck || !activeSlide) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <TopNav />
      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[16rem_1fr_18rem]">
        <aside className="hidden border-r border-border-subtle bg-surface lg:block">
          <DeckLibrary
            decks={decks}
            activeDeckId={activeDeckId}
            activeSlideId={activeSlideId}
            onSelectDeck={(id) => {
              setActiveDeckId(id);
              setActiveSlideId(decks.find((d) => d.id === id)?.slides[0]?.id ?? "");
            }}
            onSelectSlide={setActiveSlideId}
            onChangeDeck={updateDeck}
            onCreateDeck={createDeck}
          />
        </aside>
        <main className="min-w-0 overflow-hidden bg-background">
          <DeckCanvas
            deck={activeDeck}
            slide={activeSlide}
            onChangeDeck={updateDeck}
            onSelectSlide={setActiveSlideId}
            onRequestRename={renameActiveDeck}
          />
        </main>
        <aside className="hidden border-l border-border-subtle bg-surface lg:block">
          <EditPanel
            deck={activeDeck}
            slide={activeSlide}
            onChange={patchSlide}
            onResetToDefaults={resetSlideToDefaults}
          />
        </aside>
      </div>
      <SystemClock />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReportsEditor />
    </Suspense>
  );
}
