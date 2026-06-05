import { photoUrl, type PhotoId, type SectionDividerSlide } from "@/lib/mock/decks";

type Props = { slide: SectionDividerSlide };

export function SectionDividerSlideRenderer({ slide }: Props) {
  return <DividerInner title={slide.title} photoId={slide.backgroundPhotoId} eyebrow="Section" />;
}

export function DividerInner({
  title,
  photoId,
  eyebrow,
}: {
  title: string;
  photoId: PhotoId;
  eyebrow: string;
}) {
  const bg = photoUrl(photoId);
  return (
    <div className="relative flex h-full items-center justify-center">
      {bg && (
        <img
          src={bg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      <div className="relative z-10 max-w-[70%] text-center text-white">
        <p className="deck-eyebrow text-[var(--color-deck-accent)]">{eyebrow}</p>
        <h1 className="mt-3 text-6xl font-bold uppercase tracking-tight">{title}</h1>
        <div className="mx-auto mt-5 h-[3px] w-24 bg-[var(--color-deck-accent)]" />
      </div>
    </div>
  );
}
