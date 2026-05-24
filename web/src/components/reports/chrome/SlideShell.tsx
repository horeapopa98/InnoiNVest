import type { ReactNode } from "react";
import { BrandFlag } from "./BrandFlag";
import { LogoStrip } from "./LogoStrip";
import { PageNumber } from "./PageNumber";

type Props = {
  children: ReactNode;
  /** SIRUTA used by the LogoStrip's coat picker. */
  locationSiruta: string | null;
  /** 1-indexed page number; pass null to hide. */
  page: number | null;
  total: number;
  /** Optional extra root class — e.g. background override for divider slides. */
  className?: string;
  /** When true, omit the chrome (used by Cover which has its own treatment). */
  bare?: boolean;
};

/**
 * The locked, landscape-A4 frame every slide is rendered inside.
 *
 * Aspect ratio: 1.414 : 1 (A4 landscape). The parent decides the WIDTH;
 * the shell sets the height via aspect-ratio. Tied to `.deck-slide` so
 * the print stylesheet can target it.
 */
export function SlideShell({ children, locationSiruta, page, total, className = "", bare = false }: Props) {
  return (
    <article
      className={
        "deck-slide relative overflow-hidden bg-[var(--color-deck-paper)] text-[var(--color-deck-ink)] shadow-sm ring-1 ring-black/5 " +
        className
      }
      style={{ aspectRatio: "1.414 / 1" }}
    >
      {!bare && (
        <>
          <BrandFlag />
          <LogoStrip locationSiruta={locationSiruta} />
          {page !== null && <PageNumber page={page} total={total} />}
        </>
      )}
      <div className="relative z-0 h-full w-full">{children}</div>
    </article>
  );
}
