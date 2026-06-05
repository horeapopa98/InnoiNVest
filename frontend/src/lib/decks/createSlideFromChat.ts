import type { AssistantBlock } from "@/lib/mock/chat";
import { getLocation } from "@/lib/mock/locations";
import { stripMarkdown } from "@/lib/utils";
import {
  makeCitySnapshot,
  makeCountySnapshot,
  makeCommuneDetail,
  makeTrend,
  makeComparison,
  makeStatInfographic,
  makeParcelDetail,
  makeRecommendation,
  makeTextSlide,
  makeInvestmentMapSlide,
  type Slide,
} from "@/lib/mock/decks";

type Ctx = { activeDeckLocation: string | null; activeDeckYear: number };

/**
 * Map an assistant message's blocks to a single deck Slide. Order of
 * precedence: pick the most "primary" block in the message
 * (interactive recommendation > parcelMap > scorecard > lineChart >
 * metricCard > map > text). The block list is small (~5), so a linear
 * scan is fine.
 */
export function slideFromAssistantBlocks(blocks: AssistantBlock[], ctx: Ctx): Slide {
  const year = ctx.activeDeckYear;

  const reco = blocks.find((b) => b.kind === "interactiveRecommendation");
  if (reco && reco.kind === "interactiveRecommendation") {
    return makeRecommendation({ year, sector: reco.sector });
  }

  // Investment map: when the chat generated a location map, create a slide that
  // embeds the interactive map alongside the text summary.
  const locationMap = blocks.find((b) => b.kind === "locationMap");
  if (locationMap && locationMap.kind === "locationMap") {
    const textBlock = blocks.find((b) => b.kind === "text" && b.text.trim().length > 0);
    const paragraphs = textBlock && textBlock.kind === "text"
      ? stripMarkdown(textBlock.text).split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
      : [];
    return makeInvestmentMapSlide({
      year,
      title: locationMap.label ?? "Investment Location",
      paragraphs,
      mapData: {
        lat: locationMap.lat,
        lng: locationMap.lng,
        label: locationMap.label,
        radius_km: locationMap.radius_km ?? 30,
        markers: (locationMap.markers ?? []) as import("@/lib/mock/decks").InvestmentMapMarker[],
      },
    });
  }

  const parcelMap = blocks.find((b) => b.kind === "parcelMap");
  if (parcelMap && parcelMap.kind === "parcelMap" && parcelMap.parcelIds[0]) {
    return makeParcelDetail({ year, parcelId: parcelMap.parcelIds[0] });
  }

  const scorecard = blocks.find((b) => b.kind === "scorecard");
  if (scorecard && scorecard.kind === "scorecard") {
    const loc = getLocation(scorecard.locationSiruta);
    if (loc?.type === "city") return makeCitySnapshot({ year, citySiruta: scorecard.locationSiruta });
    if (loc?.type === "commune") return makeCommuneDetail({ year, communeSiruta: scorecard.locationSiruta });
    return makeCountySnapshot({ year, countySiruta: scorecard.locationSiruta });
  }

  const line = blocks.find((b) => b.kind === "lineChart");
  if (line && line.kind === "lineChart") {
    if (line.series.length >= 2) {
      return makeComparison({
        year,
        kpiCode: line.kpiCode,
        locationSirutas: line.series.map((s) => s.locationSiruta),
      });
    }
    return makeTrend({
      year,
      kpiCode: line.kpiCode,
      locationSiruta: line.series[0]?.locationSiruta ?? ctx.activeDeckLocation ?? "120",
    });
  }

  const metric = blocks.find((b) => b.kind === "metricCard");
  if (metric && metric.kind === "metricCard") {
    return {
      ...makeStatInfographic({ year, layout: "panel" }),
      stats: [
        { value: String(metric.value), label: metric.kpiCode },
      ],
    };
  }

  const map = blocks.find((b) => b.kind === "map");
  if (map && map.kind === "map") {
    return makeRecommendation({ year, sector: "general" });
  }

  const text = blocks.find((b) => b.kind === "text" && b.text.trim().length > 0);
  if (text && text.kind === "text") {
    const clean = stripMarkdown(text.text);
    return { ...makeTextSlide({ year }), paragraphs: clean.split(/\n\n+/).map((p) => p.trim()).filter(Boolean) };
  }

  return makeTextSlide({ year });
}
