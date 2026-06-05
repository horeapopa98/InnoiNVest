import { SLIDE_KIND_LABELS, slideOutlineLabel, type Slide } from "@/lib/mock/decks";

type Props = {
  slide: Slide;
  index: number;
  active: boolean;
  onSelect: () => void;
};

export function SlideThumbnail({ slide, index, active, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex w-full items-start gap-2 rounded border px-2 py-2 text-left transition-colors " +
        (active
          ? "border-primary bg-primary/5"
          : "border-transparent hover:border-border-subtle hover:bg-surface-container")
      }
    >
      <span className="mt-0.5 inline-flex h-5 w-6 shrink-0 items-center justify-center rounded bg-surface-container text-[10px] font-bold text-on-surface-variant">
        {index + 1}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[12px] font-semibold text-on-surface">
          {slideOutlineLabel(slide) || SLIDE_KIND_LABELS[slide.kind]}
        </span>
        <span className="truncate text-[10px] uppercase tracking-wider text-on-surface-variant">
          {SLIDE_KIND_LABELS[slide.kind]}
        </span>
      </span>
    </button>
  );
}
