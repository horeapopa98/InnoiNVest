import { computeComposite, DEFAULT_WEIGHTS } from "@/lib/mock/composite";
import { getLocation } from "@/lib/mock/locations";
import { NW_COUNTIES_GEOJSON } from "@/lib/mock/nw-counties-geo";
import type { RecommendationSlide } from "@/lib/mock/decks";

type Props = { slide: RecommendationSlide };

export function RecommendationSlideRenderer({ slide }: Props) {
  const scored = computeComposite(DEFAULT_WEIGHTS[slide.sector], slide.dataYear).slice(0, 6);
  const valueBySiruta = new Map(scored.map((s) => [s.locationSiruta, s.value]));

  // Bounds for the inline RO map
  const allCoords: number[][] = NW_COUNTIES_GEOJSON.features.flatMap((f) =>
    f.geometry.coordinates.flat()
  );
  const xs = allCoords.map((c) => c[0]);
  const ys = allCoords.map((c) => c[1]);
  const viewBox = `${Math.min(...xs) - 0.1} ${-(Math.max(...ys) + 0.1)} ${Math.max(...xs) - Math.min(...xs) + 0.2} ${Math.max(...ys) - Math.min(...ys) + 0.2}`;

  function pathFor(coords: number[][]): string {
    return coords.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt[0]} ${-pt[1]}`).join(" ") + " Z";
  }
  function fillFor(siruta?: string): string {
    if (!siruta) return "#e2e7e7";
    const v = valueBySiruta.get(siruta);
    if (v === undefined) return "#e2e7e7";
    const t = v / 100;
    const r = Math.round(244 - 244 * t + 21 * t);
    const g = Math.round(245 - 245 * t + 119 * t);
    const b = Math.round(239 - 239 * t + 119 * t);
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr] gap-6 px-[6%] py-[6%]">
      <div className="flex flex-col gap-4">
        <p className="deck-eyebrow">Recommendation · {slide.sector.toUpperCase()}</p>
        <h1 className="deck-underline text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
          {slide.headline}
        </h1>
        <div className="overflow-hidden rounded border border-[var(--color-deck-deep)]/15 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--color-deck-deep)]/5">
              <tr>
                <th className="py-2 pl-3 text-left text-[10px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                  Rank
                </th>
                <th className="py-2 text-left text-[10px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                  County
                </th>
                <th className="py-2 pr-3 text-right text-[10px] uppercase tracking-wider text-[var(--color-deck-muted)]">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {scored.map((s, i) => {
                const loc = getLocation(s.locationSiruta);
                return (
                  <tr key={s.locationSiruta} className="border-t border-[var(--color-deck-deep)]/10">
                    <td className="py-2 pl-3 text-[var(--color-deck-muted)]">{i + 1}</td>
                    <td className="py-2 font-medium text-[var(--color-deck-deep)]">{loc?.name ?? s.locationSiruta}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-bold text-[var(--color-deck-deep)]">
                      {s.value.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[14px] leading-relaxed text-[var(--color-deck-ink)]/80">{slide.narrative}</p>
      </div>
      <div className="grid place-items-center bg-white p-4">
        <svg viewBox={viewBox} className="h-full w-full max-h-[90%]">
          {NW_COUNTIES_GEOJSON.features.map((f) => {
            const siruta = (f.properties as { siruta?: string }).siruta;
            return (
              <path
                key={siruta}
                d={pathFor(f.geometry.coordinates[0])}
                fill={fillFor(siruta)}
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
