import type { StrategicLocationSlide } from "@/lib/mock/decks";
import { DividerInner } from "./SectionDividerSlideRenderer";

export function StrategicLocationSlideRenderer({ slide }: { slide: StrategicLocationSlide }) {
  return <DividerInner title={slide.title} photoId={slide.backgroundPhotoId} eyebrow="Strategic location" />;
}
