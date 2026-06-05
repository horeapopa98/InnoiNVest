import dynamic from "next/dynamic";
import { Plane, Truck, Globe2 } from "lucide-react";
import type { InfrastructurePageSlide } from "@/lib/mock/decks";

const MapFallback = () => (
  <div className="grid h-full place-items-center bg-[var(--color-deck-muted)]/10 text-[12px] text-[var(--color-deck-muted)]">
    Loading map…
  </div>
);
const InfrastructureMap = dynamic(
  () => import("./InfrastructureMap").then((m) => m.InfrastructureMap),
  { ssr: false, loading: MapFallback }
);

const ICONS = [Truck, Plane, Globe2];

export function InfrastructurePageSlideRenderer({ slide }: { slide: InfrastructurePageSlide }) {
  return (
    <div className="grid h-full grid-cols-[1fr_1.2fr] gap-5 p-[5%]">
      <div className="flex flex-col gap-5">
        <p className="deck-eyebrow">Infrastructure</p>
        <h1 className="deck-underline text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
          {slide.headline}
        </h1>
        <ul className="flex flex-col gap-4">
          {slide.distances.map((d, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <li
                key={i}
                className="flex items-center gap-4 rounded border border-[var(--color-deck-deep)]/15 bg-white p-4"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full text-white"
                  style={{ background: "var(--color-deck-deep)" }}
                >
                  <Icon size={22} />
                </span>
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                    {d.label}
                  </span>
                  <span className="text-2xl font-bold text-[var(--color-deck-deep)]">{d.value}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="relative overflow-hidden rounded border border-[var(--color-deck-deep)]/15">
        <InfrastructureMap parcelId={slide.parcelId} />
      </div>
    </div>
  );
}
