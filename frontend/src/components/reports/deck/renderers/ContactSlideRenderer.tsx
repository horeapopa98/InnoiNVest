import type { ContactSlide } from "@/lib/mock/decks";

type Props = { slide: ContactSlide };

export function ContactSlideRenderer({ slide }: Props) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-8 px-[8%] py-[8%] text-center text-white"
      style={{ background: "var(--color-deck-deep)" }}
    >
      <p className="deck-eyebrow text-[var(--color-deck-accent)]">Contact</p>
      <h1 className="text-5xl font-bold tracking-tight">{slide.headline}</h1>
      <dl className="grid grid-cols-1 gap-2 text-[15px]">
        {slide.contactRows.map((r, i) => (
          <div key={i} className="flex items-center justify-center gap-3">
            <dt className="text-white/60">{r.label}</dt>
            <dd className="font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[14px] text-[var(--color-deck-accent)]">{slide.ctaText}</p>
    </div>
  );
}
