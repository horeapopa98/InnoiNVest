import dynamic from "next/dynamic";
import { getParcel } from "@/lib/mock/parcels";
import { getLocation } from "@/lib/mock/locations";
import type { ParcelDetailSlide } from "@/lib/mock/decks";

const MapFallback = () => (
  <div className="grid h-full place-items-center bg-[var(--color-deck-muted)]/10 text-[12px] text-[var(--color-deck-muted)]">
    Loading map…
  </div>
);
const ParcelDetailMap = dynamic(
  () => import("./ParcelDetailMap").then((m) => m.ParcelDetailMap),
  { ssr: false, loading: MapFallback }
);

export function ParcelDetailSlideRenderer({ slide }: { slide: ParcelDetailSlide }) {
  const p = getParcel(slide.parcelId);
  const loc = p ? getLocation(p.nearestSiruta) : undefined;
  return (
    <div className="grid h-full grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-4 p-[5%]">
        <p className="deck-eyebrow">
          {loc?.name ?? ""} · {p?.areaHa ?? "—"} ha
        </p>
        <h1 className="deck-underline text-3xl font-bold uppercase tracking-tight text-[var(--color-deck-deep)]">
          {slide.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          {slide.features.map((f) => (
            <span
              key={f}
              className="rounded-full bg-[var(--color-deck-deep)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white"
            >
              {f}
            </span>
          ))}
        </div>
        <ul className="mt-2 flex flex-col gap-2 text-[13px] text-[var(--color-deck-ink)]/90">
          {slide.keyFeatures.map((kf, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-deck-accent)]" />
              <span>{kf}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto rounded border border-[var(--color-deck-deep)]/15 bg-white p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-deck-muted)]">
            Indicated price
          </p>
          <p className="text-lg font-bold text-[var(--color-deck-deep)]">{slide.indicatedPrice}</p>
        </div>
      </div>
      <div className="relative">
        <ParcelDetailMap parcelId={slide.parcelId} />
      </div>
    </div>
  );
}
