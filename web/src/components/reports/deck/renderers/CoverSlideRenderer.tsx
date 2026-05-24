import type { CoverSlide } from "@/lib/mock/decks";
import { NW_COUNTIES_GEOJSON } from "@/lib/mock/nw-counties-geo";

type Props = { slide: CoverSlide };

/**
 * Cover layout: deep teal hero band on the left with title + meta,
 * cream right column carrying an inline-SVG RO map (NW counties
 * only — the same outline used by MapBlock). The deck's county is
 * highlighted in the accent orange.
 */
export function CoverSlideRenderer({ slide }: Props) {
  // Compute the bounding box of the NW counties so the SVG can fit-to-content.
  const allCoords: number[][] = NW_COUNTIES_GEOJSON.features.flatMap((f) =>
    f.geometry.coordinates.flat()
  );
  const xs = allCoords.map((c) => c[0]);
  const ys = allCoords.map((c) => c[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;
  const PAD = 0.2;
  const viewBox = `${minX - PAD} ${-(maxY + PAD)} ${w + 2 * PAD} ${h + 2 * PAD}`;

  function pathFor(coords: number[][]): string {
    return (
      coords
        .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt[0]} ${-pt[1]}`)
        .join(" ") + " Z"
    );
  }

  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr]">
      <div
        className="flex flex-col justify-between p-[6%] text-white"
        style={{ background: "var(--color-deck-deep)" }}
      >
        <div>
          <p className="deck-eyebrow text-[var(--color-deck-accent)]">{slide.preparedFor}</p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight">{slide.title}</h1>
          <p className="mt-3 text-[18px] text-white/80">{slide.subtitle}</p>
        </div>
        <div className="text-[12px] text-white/60">{slide.dateIssued}</div>
      </div>
      <div className="grid place-items-center bg-[var(--color-deck-paper)] p-[6%]">
        <svg viewBox={viewBox} className="h-full w-full max-h-[70%] max-w-[80%]">
          {NW_COUNTIES_GEOJSON.features.map((f) => {
            const isActive =
              slide.highlightCounty !== null &&
              f.properties.siruta === slide.highlightCounty;
            return (
              <path
                key={f.properties.siruta ?? f.id}
                d={pathFor(f.geometry.coordinates[0])}
                fill={isActive ? "var(--color-deck-accent)" : "#d8e3e2"}
                stroke="#fff"
                strokeWidth={0.02}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
