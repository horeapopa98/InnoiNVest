/**
 * ADR Nord-Vest flag — locked top-left of every slide. Clip-path forms
 * an arrow shape mirroring the reference PDF; size scales with the slide.
 */
export function BrandFlag() {
  return (
    <div
      aria-hidden="true"
      className="absolute left-0 top-0 z-10 flex h-[6.5%] w-[2.6%] flex-col items-center justify-start pt-[0.6%]"
      style={{
        background: "var(--color-deck-deep)",
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 88%, 0 100%)",
      }}
    >
      <span
        className="rotate-0 text-center text-[6px] font-bold leading-[1.1] tracking-wide text-white"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        ADR NV
      </span>
    </div>
  );
}
