/**
 * Small grouped bar chart — used in chat answers and in the report
 * builder's appendix comparison block. Renders 2–8 bars; for richer
 * charts later, swap to Recharts.
 */

type Bar = {
  label: string;
  value: number;
  /** Optional override of bar color tone. */
  tone?: "primary" | "secondary" | "muted" | "error";
};

type Props = {
  bars: readonly Bar[];
  width?: number;
  height?: number;
  ariaLabel?: string;
};

const TONE_CLASS: Record<NonNullable<Bar["tone"]>, string> = {
  primary: "fill-primary",
  secondary: "fill-secondary",
  muted: "fill-on-surface-variant/40",
  error: "fill-error",
};

export function MiniBarChart({
  bars,
  width = 320,
  height = 140,
  ariaLabel,
}: Props) {
  if (bars.length === 0) return null;
  const max = Math.max(...bars.map((b) => Math.abs(b.value)));
  const padTop = 18;
  const padBottom = 24;
  const padX = 8;
  const drawArea = height - padTop - padBottom;
  const barGap = 8;
  const barWidth = (width - padX * 2 - barGap * (bars.length - 1)) / bars.length;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      {bars.map((b, i) => {
        const h = max === 0 ? 0 : (Math.abs(b.value) / max) * drawArea;
        const x = padX + i * (barWidth + barGap);
        const y = padTop + (drawArea - h);
        const toneClass = TONE_CLASS[b.tone ?? "primary"];
        return (
          <g key={b.label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={2}
              className={toneClass}
            />
            <text
              x={x + barWidth / 2}
              y={padTop - 4}
              textAnchor="middle"
              className="fill-on-surface text-[10px] font-semibold"
            >
              {b.value.toLocaleString("en-US", { maximumFractionDigits: 1 })}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - 6}
              textAnchor="middle"
              className="fill-on-surface-variant text-[10px]"
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
