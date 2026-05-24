import type { TextSlide } from "@/lib/mock/decks";

type Props = { slide: TextSlide };

export function TextSlideRenderer({ slide }: Props) {
  return (
    <div className="flex h-full flex-col gap-6 px-[8%] py-[8%]">
      <h1 className="deck-underline text-4xl font-bold tracking-tight text-[var(--color-deck-deep)]">
        {slide.title}
      </h1>
      <div className="flex flex-col gap-4 text-[16px] leading-relaxed text-[var(--color-deck-ink)]">
        {slide.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}
