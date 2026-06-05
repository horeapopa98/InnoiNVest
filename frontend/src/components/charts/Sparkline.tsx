/**
 * Lightweight inline-SVG sparkline. No chart library — values are small
 * (typically ≤10 points), styling needs to match brand tokens
 * (--color-primary, etc.), and we don't need axes or tooltips for the
 * report and chat usage.
 */

type Props = {
  values: readonly number[];
  width?: number;
  height?: number;
  /** Tailwind color class for the stroke (defaults to brand teal). */
  strokeClassName?: string;
  /** Tailwind color class for the area fill (defaults to faint primary). */
  fillClassName?: string;
  strokeWidth?: number;
  ariaLabel?: string;
};

export function Sparkline({
  values,
  width = 160,
  height = 40,
  strokeClassName = "stroke-primary",
  fillClassName = "fill-primary/15",
  strokeWidth = 1.5,
  ariaLabel,
}: Props) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          className="stroke-border-subtle"
          strokeWidth={1}
        />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${width.toFixed(2)},${height.toFixed(2)} L0,${height.toFixed(2)} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : "true"}
    >
      <path d={areaPath} className={fillClassName} />
      <path
        d={linePath}
        className={strokeClassName}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
