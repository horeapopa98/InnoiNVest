import { formatKpiValue, getKpi } from "@/lib/mock/kpis";
import { getObservation } from "@/lib/mock/observations";
import { photoUrl, type CitySnapshotSlide } from "@/lib/mock/decks";

type Props = { slide: CitySnapshotSlide };

export function CitySnapshotSlideRenderer({ slide }: Props) {
  const photo = photoUrl(slide.photoId);
  const tiles = slide.kpiCodes.slice(0, 4).map((code) => {
    const kpi = getKpi(code);
    const o = kpi ? getObservation(slide.locationSiruta, code, slide.dataYear) : undefined;
    return {
      code,
      label: kpi?.nameEn ?? code,
      value: kpi ? formatKpiValue(o?.value, kpi) : "—",
    };
  });
  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-5 p-[6%]">
        <div>
          <p className="deck-eyebrow">{slide.eyebrow}</p>
          <h1 className="deck-underline mt-2 text-4xl font-bold tracking-tight text-[var(--color-deck-deep)]">
            {slide.headline}
          </h1>
        </div>
        <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-[var(--color-deck-ink)]">
          {slide.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <div key={t.code} className="rounded border border-[var(--color-deck-deep)]/15 bg-white p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-deck-muted)]">
                {t.label}
              </p>
              <p className="mt-1 text-xl font-bold text-[var(--color-deck-deep)]">{t.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative">
        {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div
          className="absolute inset-x-0 bottom-0 h-[40%]"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,.5), transparent)" }}
        />
      </div>
    </div>
  );
}
