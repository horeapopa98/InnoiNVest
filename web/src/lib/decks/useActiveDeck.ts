"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/persistence/keys";
import { readStorage, writeStorage } from "@/lib/persistence/storage";
import { makeInvestorPitchDeck, type Deck, type Slide } from "@/lib/mock/decks";
import { slideFromAssistantBlocks } from "./createSlideFromChat";
import type { AssistantBlock } from "@/lib/mock/chat";

/**
 * Reads/writes the active deck via localStorage; exposes a single
 * `addSlideFromChat` action used by the AssistantCard "Use in report".
 */
export function useActiveDeck() {
  const router = useRouter();

  const addSlideFromChat = useCallback(
    (blocks: AssistantBlock[]) => {
      const year = readStorage<number>(STORAGE_KEYS.systemYear, new Date().getFullYear());
      let decks = readStorage<Deck[]>(STORAGE_KEYS.decks, []);
      let activeId = readStorage<string>(STORAGE_KEYS.activeDeck, decks[0]?.id ?? "");

      // Bootstrap: create an Investor Pitch deck if none exists.
      if (decks.length === 0) {
        const seeded = makeInvestorPitchDeck({ year });
        decks = [seeded];
        activeId = seeded.id;
      } else if (!decks.find((d) => d.id === activeId)) {
        activeId = decks[0].id;
      }

      const active = decks.find((d) => d.id === activeId)!;
      const newSlide: Slide = slideFromAssistantBlocks(blocks, {
        activeDeckLocation: active.locationSiruta,
        activeDeckYear: active.systemYear,
      });
      const newDecks = decks.map((d) =>
        d.id === active.id
          ? { ...d, slides: [...d.slides, newSlide], updatedAt: Date.now() }
          : d
      );

      writeStorage(STORAGE_KEYS.decks, newDecks);
      writeStorage(STORAGE_KEYS.activeDeck, active.id);
      router.push(`/reports?slide=${newSlide.id}`);
    },
    [router]
  );

  return { addSlideFromChat };
}
