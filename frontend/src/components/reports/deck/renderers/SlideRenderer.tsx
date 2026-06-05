import type * as React from "react";
import { SlideShell } from "@/components/reports/chrome/SlideShell";
import type { Deck, Slide } from "@/lib/mock/decks";
import { TextSlideRenderer } from "./TextSlideRenderer";
import { ContactSlideRenderer } from "./ContactSlideRenderer";
import { SectionDividerSlideRenderer } from "./SectionDividerSlideRenderer";
import { StrategicLocationSlideRenderer } from "./StrategicLocationSlideRenderer";
import { InfrastructureDividerSlideRenderer } from "./InfrastructureDividerSlideRenderer";
import { CoverSlideRenderer } from "./CoverSlideRenderer";
import { CountySnapshotSlideRenderer } from "./CountySnapshotSlideRenderer";
import { CitySnapshotSlideRenderer } from "./CitySnapshotSlideRenderer";
import { CommuneDetailSlideRenderer } from "./CommuneDetailSlideRenderer";
import { StatInfographicSlideRenderer } from "./StatInfographicSlideRenderer";
import { TrendSlideRenderer } from "./TrendSlideRenderer";
import { ComparisonSlideRenderer } from "./ComparisonSlideRenderer";
import { RecommendationSlideRenderer } from "./RecommendationSlideRenderer";
import { ParcelDetailSlideRenderer } from "./ParcelDetailSlideRenderer";
import { InfrastructurePageSlideRenderer } from "./InfrastructurePageSlideRenderer";
import { InvestmentMapSlideRenderer } from "./InvestmentMapSlideRenderer";

type Props = {
  slide: Slide;
  /** 1-indexed page number; null hides the page number (cover/contact). */
  page: number | null;
  total: number;
  deck: Deck;
  /** When true, render in fixed read-only mode (no contenteditable). */
  readOnly: boolean;
  /** Called with a patched slide when an editable field commits. */
  onChange?: (patch: Partial<Slide>) => void;
};

/**
 * Discriminated-union switch. Each kind delegates to its own renderer.
 * Renderers are added in Waves 4-6; until then the default branch shows
 * a clear placeholder so the editor scaffolding can be exercised early.
 */
export function SlideRenderer({ slide, page, total, deck, readOnly, onChange }: Props) {
  function renderBody(): React.ReactNode {
    switch (slide.kind) {
      case "cover":
        return <CoverSlideRenderer slide={slide} />;
      case "text":
        return <TextSlideRenderer slide={slide} />;
      case "contact":
        return <ContactSlideRenderer slide={slide} />;
      case "section_divider":
        return <SectionDividerSlideRenderer slide={slide} />;
      case "strategic_location":
        return <StrategicLocationSlideRenderer slide={slide} />;
      case "infrastructure_divider":
        return <InfrastructureDividerSlideRenderer slide={slide} />;
      case "county_snapshot":
        return <CountySnapshotSlideRenderer slide={slide} />;
      case "city_snapshot":
        return <CitySnapshotSlideRenderer slide={slide} />;
      case "commune_detail":
        return <CommuneDetailSlideRenderer slide={slide} />;
      case "stat_infographic":
        return <StatInfographicSlideRenderer slide={slide} />;
      case "trend":
        return <TrendSlideRenderer slide={slide} />;
      case "comparison":
        return <ComparisonSlideRenderer slide={slide} />;
      case "recommendation":
        return <RecommendationSlideRenderer slide={slide} />;
      case "parcel_detail":
        return <ParcelDetailSlideRenderer slide={slide} />;
      case "infrastructure_page":
        return <InfrastructurePageSlideRenderer slide={slide} />;
      case "investment_map":
        return <InvestmentMapSlideRenderer slide={slide} />;
    }
  }

  return (
    <SlideShell
      locationSiruta={deck.locationSiruta}
      page={slide.kind === "cover" || slide.kind === "contact" ? null : page}
      total={total}
      bare={slide.kind === "cover"}
    >
      {renderBody()}
    </SlideShell>
  );
}
