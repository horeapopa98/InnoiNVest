import { getLocation } from "@/lib/mock/locations";

export type DeckLineSeries = {
  locationSiruta: string;
  points: Array<{ year: number; value: number }>;
};

type Props = {
  series: DeckLineSeries[];
  yearRange: [number, number];
  width?: number;
  height?: number;
  unit?: string;
};

const SERIES_COLORS = ["#157777", "#f5a623", "#1ea29a", "#3f51b5", "#de0b24"];

export function DeckLineChart({ series, yearRange, width = 800, height = 320, unit }: Props) {
  const [yFrom, yTo] = yearRange;
  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const vMin = Math.min(...allValues);
  const vMax = Math.max(...allValues);
  const padX = 60;
  const padY = 40;
  const W = width;
  const H = height;
  const xOf = (year: number) =>
    padX + ((year - yFrom) / Math.max(1, yTo - yFrom)) * (W - padX * 2);
  const yOf = (v: number) =>
    H - padY - ((v - vMin) / Math.max(1e-9, vMax - vMin)) * (H - padY * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* axes */}
      <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="#cbd5d4" strokeWidth={1} />
      <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke="#cbd5d4" strokeWidth={1} />
      {/* y ticks */}
      {[0, 0.5, 1].map((t) => {
        const v = vMin + (vMax - vMin) * t;
        const y = yOf(v);
        return (
          <g key={t}>
            <line x1={padX - 4} y1={y} x2={padX} y2={y} stroke="#cbd5d4" />
            <text x={padX - 8} y={y + 3} fontSize={10} textAnchor="end" fill="#6b7271">
              {v.toFixed(0)}
            </text>
          </g>
        );
      })}
      {/* x ticks */}
      {Array.from({ length: yTo - yFrom + 1 }).map((_, i) => {
        const year = yFrom + i;
        const x = xOf(year);
        return (
          <g key={year}>
            <line x1={x} y1={H - padY} x2={x} y2={H - padY + 4} stroke="#cbd5d4" />
            <text x={x} y={H - padY + 16} fontSize={10} textAnchor="middle" fill="#6b7271">
              {year}
            </text>
          </g>
        );
      })}
      {/* series */}
      {series.map((s, idx) => {
        const colour = SERIES_COLORS[idx % SERIES_COLORS.length];
        const d = s.points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(p.year)} ${yOf(p.value)}`)
          .join(" ");
        return (
          <g key={s.locationSiruta}>
            <path d={d} fill="none" stroke={colour} strokeWidth={2.5} strokeLinejoin="round" />
            {s.points.map((p) => (
              <circle key={p.year} cx={xOf(p.year)} cy={yOf(p.value)} r={3} fill={colour} />
            ))}
          </g>
        );
      })}
      {/* legend */}
      <g transform={`translate(${padX}, ${padY - 24})`}>
        {series.map((s, idx) => {
          const loc = getLocation(s.locationSiruta);
          return (
            <g key={s.locationSiruta} transform={`translate(${idx * 140}, 0)`}>
              <rect width={10} height={10} fill={SERIES_COLORS[idx % SERIES_COLORS.length]} />
              <text x={16} y={9} fontSize={11} fill="#1a2322">
                {loc?.name ?? s.locationSiruta} {unit ? `(${unit})` : ""}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
