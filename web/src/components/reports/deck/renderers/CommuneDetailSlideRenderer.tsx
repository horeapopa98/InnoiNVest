import { photoUrl, type CommuneDetailSlide } from "@/lib/mock/decks";

type Props = { slide: CommuneDetailSlide };

export function CommuneDetailSlideRenderer({ slide }: Props) {
  const photo = photoUrl(slide.heroPhotoId);
  return (
    <div className="grid h-full grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-between p-[7%]">
        <div>
          <p className="deck-eyebrow">Commune</p>
          <h1 className="deck-underline mt-2 text-4xl font-bold tracking-tight text-[var(--color-deck-deep)]">
            {slide.headline}
          </h1>
          <div className="mt-5 flex flex-col gap-3 text-[14px] leading-relaxed text-[var(--color-deck-ink)]">
            {slide.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        <div
          className="mt-6 rounded border-l-4 border-[var(--color-deck-accent)] bg-white p-4 text-[14px] font-semibold text-[var(--color-deck-deep)]"
        >
          {slide.calloutText}
        </div>
      </div>
      <div className="relative">
        {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      </div>
    </div>
  );
}
