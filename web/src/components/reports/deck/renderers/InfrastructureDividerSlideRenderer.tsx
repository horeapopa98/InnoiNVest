import type { InfrastructureDividerSlide } from "@/lib/mock/decks";
import { DividerInner } from "./SectionDividerSlideRenderer";

export function InfrastructureDividerSlideRenderer({ slide }: { slide: InfrastructureDividerSlide }) {
  return <DividerInner title={slide.title} photoId={slide.backgroundPhotoId} eyebrow="Infrastructure" />;
}
