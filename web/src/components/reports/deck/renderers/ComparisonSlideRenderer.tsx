import { getKpi } from "@/lib/mock/kpis";
import { getSeries } from "@/lib/mock/observations";
import { DeckLineChart, type DeckLineSeries } from "./DeckLineChart";
import type { ComparisonSlide } from "@/lib/mock/decks";

export function ComparisonSlideRenderer({ slide }: { slide: ComparisonSlide }) {
  const kpi = getKpi(slide.kpiCode);
  const series: DeckLineSeries[] = slide.locationSirutas.map((siruta) => ({
    locationSiruta: siruta,
    points: getSeries(siruta, slide.kpiCode)
      .filter((o) => o.year >= slide.yearRange[0] && o.year <= slide.yearRange[1])
      .map((o) => ({ year: o.year, value: o.value })),
  }));
  return (
    <div className="flex h-full flex-col gap-4 px-[6%] py-[6%]">
      <div>
        <p className="deck-eyebrow">{kpi?.nameEn ?? slide.kpiCode}</p>
        <h1 className="deck-underline mt-2 text-3xl font-bold tracking-tight text-[var(--color-deck-deep)]">
          {slide.headline}
        </h1>
      </div>
      <div className="flex-1">
        <DeckLineChart series={series} yearRange={slide.yearRange} unit={kpi?.unit} />
      </div>
      <p className="text-[14px] leading-relaxed text-[var(--color-deck-ink)]/80">{slide.commentary}</p>
    </div>
  );
}
