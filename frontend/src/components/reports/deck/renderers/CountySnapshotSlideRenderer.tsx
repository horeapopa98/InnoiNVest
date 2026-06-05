import { formatKpiValue, getKpi } from "@/lib/mock/kpis";
import { getLocation } from "@/lib/mock/locations";
import { getObservation, getSeries } from "@/lib/mock/observations";
import { Sparkline } from "@/components/charts/Sparkline";
import type { CountySnapshotSlide } from "@/lib/mock/decks";

type Props = { slide: CountySnapshotSlide };

export function CountySnapshotSlideRenderer({ slide }: Props) {
  const loc = getLocation(slide.locationSiruta);
  const tiles = slide.kpiCodes.slice(0, 4).map((code) => {
    const kpi = getKpi(code);
    const o = kpi ? getObservation(slide.locationSiruta, code, slide.dataYear) : undefined;
    return {
      code,
      label: kpi?.nameEn ?? code,
      value: kpi ? formatKpiValue(o?.value, kpi) : "—",
    };
  });
  const sparkValues = slide.kpiCodes.slice(0, 4).map((code) =>
    getSeries(slide.locationSiruta, code).map((o) => o.value)
  );
  return (
    <div className="flex h-full flex-col gap-6 px-[7%] py-[7%]">
      <div>
        <p className="deck-eyebrow">{slide.eyebrow}</p>
        <h1 className="deck-underline mt-2 text-4xl font-bold tracking-tight text-[var(--color-deck-deep)]">
          {slide.headline}
        </h1>
        <p className="mt-1 text-[12px] text-[var(--color-deck-muted)]">
          {loc?.countyName ?? ""} · {slide.dataYear}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {tiles.map((t) => (
          <div
            key={t.code}
            className="rounded-md border border-[var(--color-deck-deep)]/15 bg-white p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-deck-muted)]">
              {t.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-deck-deep)]">{t.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto grid grid-cols-4 gap-4">
        {sparkValues.map((vals, i) => (
          <div key={i} className="rounded bg-white/60 p-2">
            <Sparkline values={vals} width={180} height={36} />
          </div>
        ))}
      </div>
      {slide.narrative && (
        <p className="text-[14px] leading-relaxed text-[var(--color-deck-ink)]/80">{slide.narrative}</p>
      )}
    </div>
  );
}
