"use client";

import dynamic from "next/dynamic";
import type { InvestmentMapSlide } from "@/lib/mock/decks";

const LocationMapBlock = dynamic(
  () =>
    import("@/components/chat/blocks/LocationMapBlock").then(
      (m) => m.LocationMapBlock
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-border-subtle bg-surface-muted text-sm text-on-surface-variant">
        Loading map…
      </div>
    ),
  }
);

type Props = { slide: InvestmentMapSlide };

export function InvestmentMapSlideRenderer({ slide }: Props) {
  const { mapData, title, paragraphs } = slide;

  return (
    <div className="flex h-full flex-col px-[8%] py-[6%] gap-4">
      {/* Title */}
      <h1 className="deck-underline shrink-0 text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
        {title}
      </h1>

      {/* Map + text side by side */}
      <div className="flex min-h-0 flex-1 gap-6">
        {/* Map — left 60% */}
        <div className="relative min-h-0 flex-[3] overflow-hidden rounded-lg">
          <LocationMapBlock
            lat={mapData.lat}
            lng={mapData.lng}
            label={mapData.label}
            radius_km={mapData.radius_km}
            markers={mapData.markers}
            mapHeight="100%"
          />
        </div>

        {/* Text summary — right 40% */}
        {paragraphs.length > 0 && (
          <div className="flex-[2] overflow-y-auto">
            <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-deck-ink)]">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
