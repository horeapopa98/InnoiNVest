import { getLocation } from "@/lib/mock/locations";

type Props = {
  locationSiruta: string | null;
};

/**
 * Top-right logo strip: location coat-of-arms (placeholder SVG) +
 * INNO wordmark. Auto-selects coat based on the deck's county.
 */
export function LogoStrip({ locationSiruta }: Props) {
  const loc = locationSiruta ? getLocation(locationSiruta) : undefined;
  const countyCode = loc?.countyCode ?? "default";
  const coatHref = `/deck-photos/coats/${countyCode}.svg`;
  return (
    <div className="absolute right-[3%] top-[2.5%] z-10 flex items-center gap-3">
      {/* Coat-of-arms — falls back to default when the file is missing. */}
      <img
        src={coatHref}
        alt=""
        className="h-10 w-auto"
        onError={(e) => {
          const t = e.currentTarget;
          if (!t.dataset.fallback) {
            t.dataset.fallback = "1";
            t.src = "/deck-photos/coats/default.svg";
          }
        }}
      />
      <div className="flex flex-col items-end leading-none">
        <span className="text-[10px] font-semibold tracking-wide text-[var(--color-deck-deep)]">
          INNO
        </span>
        <span className="text-[8px] tracking-wider text-[var(--color-deck-muted)]">
          NORD-VEST
        </span>
      </div>
    </div>
  );
}
