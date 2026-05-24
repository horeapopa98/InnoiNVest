"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Copy, Trash2 } from "lucide-react";
import {
  defaultSlideForKind,
  makeBlankDeck,
  makeInvestorPitchDeck,
  slideOutlineLabel,
  SLIDE_KIND_LABELS,
  type Deck,
  type Slide,
  type SlideKind,
} from "@/lib/mock/decks";
import { SlideThumbnail } from "./SlideThumbnail";
import { SlidePalette } from "./SlidePalette";

type Props = {
  decks: Deck[];
  activeDeckId: string;
  activeSlideId: string | null;
  onSelectDeck: (id: string) => void;
  onSelectSlide: (id: string) => void;
  onChangeDeck: (deck: Deck) => void;
  onCreateDeck: (deck: Deck) => void;
};

export function DeckLibrary({
  decks,
  activeDeckId,
  activeSlideId,
  onSelectDeck,
  onSelectSlide,
  onChangeDeck,
  onCreateDeck,
}: Props) {
  const active = decks.find((d) => d.id === activeDeckId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    if (!active || !e.over || e.active.id === e.over.id) return;
    const ids = active.slides.map((s) => s.id);
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    onChangeDeck({ ...active, slides: arrayMove(active.slides, from, to), updatedAt: Date.now() });
  }

  function addSlide(kind: SlideKind) {
    if (!active) return;
    const ns = defaultSlideForKind(kind, { year: active.systemYear, locationSiruta: active.locationSiruta });
    const after = active.slides.findIndex((s) => s.id === activeSlideId);
    const slides = [...active.slides];
    const insertAt = after >= 0 ? after + 1 : slides.length;
    slides.splice(insertAt, 0, ns);
    onChangeDeck({ ...active, slides, updatedAt: Date.now() });
    onSelectSlide(ns.id);
  }
  function duplicateSlide(id: string) {
    if (!active) return;
    const idx = active.slides.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const dup = { ...active.slides[idx], id: `${id}-copy-${Date.now().toString(36)}` };
    const slides = [...active.slides];
    slides.splice(idx + 1, 0, dup);
    onChangeDeck({ ...active, slides, updatedAt: Date.now() });
    onSelectSlide(dup.id);
  }
  function deleteSlide(id: string) {
    if (!active || active.slides.length <= 1) return;
    const slides = active.slides.filter((s) => s.id !== id);
    onChangeDeck({ ...active, slides, updatedAt: Date.now() });
    if (id === activeSlideId) onSelectSlide(slides[0]?.id ?? "");
  }
  function newDeck() {
    const cloneFrom = decks.find((d) => d.templateOrigin === "investor-pitch");
    const mine = decks.filter((d) => !d.isShared).length;
    const ns = cloneFrom
      ? { ...makeInvestorPitchDeck({ year: cloneFrom.systemYear }), id: `deck-${Date.now().toString(36)}`, isShared: false, title: `Investor Pitch ${mine + 1}` }
      : makeBlankDeck({ year: new Date().getFullYear() });
    onCreateDeck(ns);
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <section>
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          Decks
        </p>
        <ul className="mt-1 flex flex-col">
          {decks.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSelectDeck(d.id)}
                className={
                  "block w-full rounded px-2 py-1.5 text-left text-xs " +
                  (d.id === activeDeckId
                    ? "bg-primary/10 font-semibold text-primary-deep"
                    : "hover:bg-surface-container")
                }
              >
                {d.title}
                {d.isShared && (
                  <span className="ml-1 text-[9px] uppercase tracking-wider text-on-surface-variant">
                    shared
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={newDeck}
          className="mt-1 inline-flex w-full items-center gap-1 rounded border border-dashed border-border-subtle px-2 py-1.5 text-xs text-on-surface-variant hover:border-primary hover:text-primary-deep"
        >
          <Plus size={12} /> New deck
        </button>
      </section>

      <hr className="border-border-subtle" />

      <section className="flex min-h-0 flex-1 flex-col">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          Slides
        </p>
        {active && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={active.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
                {active.slides.map((slide, i) => (
                  <SortableRow
                    key={slide.id}
                    slide={slide}
                    index={i}
                    active={slide.id === activeSlideId}
                    onSelect={() => onSelectSlide(slide.id)}
                    onDuplicate={() => duplicateSlide(slide.id)}
                    onDelete={() => deleteSlide(slide.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <div className="mt-2">
          <SlidePalette onPick={addSlide} />
        </div>
      </section>
    </div>
  );
}

function SortableRow({
  slide,
  index,
  active,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  slide: Slide;
  index: number;
  active: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const [showMenu, setShowMenu] = useState(false);
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group relative flex items-start gap-1"
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      <button
        type="button"
        className="mt-2 cursor-grab text-on-surface-variant/50 hover:text-on-surface"
        aria-label={`Reorder ${slideOutlineLabel(slide) || SLIDE_KIND_LABELS[slide.kind]}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={12} />
      </button>
      <div className="min-w-0 flex-1">
        <SlideThumbnail slide={slide} index={index} active={active} onSelect={onSelect} />
      </div>
      {showMenu && (
        <div
          onMouseLeave={() => setShowMenu(false)}
          className="absolute right-0 top-6 z-30 flex flex-col rounded border border-border-subtle bg-surface-container-lowest text-xs shadow-lg"
        >
          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-surface-container"
            onClick={() => {
              setShowMenu(false);
              onDuplicate();
            }}
          >
            <Copy size={12} /> Duplicate
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1.5 text-error hover:bg-surface-container"
            onClick={() => {
              setShowMenu(false);
              onDelete();
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </li>
  );
}
