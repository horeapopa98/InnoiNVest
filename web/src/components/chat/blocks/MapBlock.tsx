"use client";

import { useMemo } from "react";
import { getKpi } from "@/lib/mock/kpis";
import { LOCATIONS } from "@/lib/mock/locations";

type Props = {
  kpiCode: string;
  year: number;
  valuesByCounty: Record<string, number>;
};

/**
 * Hex layout for the 6 NW Romania counties. Positions are geographic-
 * suggestive (not survey-accurate) — Maramureș and Satu Mare on the
 * north tier, Sălaj and Bistrița-Năsăud in the middle, Bihor and Cluj
 * on the south tier. A pointy-top hex cartogram is the right tool
 * here: shape matters less than identity, and equal-area cells let
 * readers compare values across regions without an area bias.
 */
const HEX_SIZE = 28; // radius corner-to-center
const HEX_W = Math.sqrt(3) * HEX_SIZE;
const HEX_H = 2 * HEX_SIZE;
const ROW_SPACING = 0.75 * HEX_H;

type HexPos = { sirutaCode: string; cx: number; cy: number };

const HEX_POSITIONS: HexPos[] = [
  // Row 0 (north)
  { sirutaCode: "393", cx: HEX_W / 2 + HEX_W, cy: HEX_SIZE + 4 }, // Satu Mare
  { sirutaCode: "275", cx: HEX_W / 2 + 2 * HEX_W, cy: HEX_SIZE + 4 }, // Maramureș
  // Row 1 (offset right by half a hex)
  { sirutaCode: "402", cx: HEX_W + HEX_W, cy: HEX_SIZE + ROW_SPACING + 4 }, // Sălaj
  { sirutaCode: "63", cx: HEX_W + 2 * HEX_W, cy: HEX_SIZE + ROW_SPACING + 4 }, // Bistrița-Năsăud
  // Row 2 (south)
  { sirutaCode: "54", cx: HEX_W / 2 + HEX_W, cy: HEX_SIZE + 2 * ROW_SPACING + 4 }, // Bihor
  { sirutaCode: "120", cx: HEX_W / 2 + 2 * HEX_W, cy: HEX_SIZE + 2 * ROW_SPACING + 4 }, // Cluj
];

const VIEW_W = Math.max(...HEX_POSITIONS.map((h) => h.cx)) + HEX_W;
const VIEW_H = Math.max(...HEX_POSITIONS.map((h) => h.cy)) + HEX_SIZE + 8;

function hexPath(cx: number, cy: number, size: number): string {
  const w = (Math.sqrt(3) / 2) * size;
  return [
    `M${cx},${cy - size}`,
    `L${cx + w},${cy - size / 2}`,
    `L${cx + w},${cy + size / 2}`,
    `L${cx},${cy + size}`,
    `L${cx - w},${cy + size / 2}`,
    `L${cx - w},${cy - size / 2}`,
    "Z",
  ].join(" ");
}

/**
 * Map a normalised 0..1 value to a teal swatch. Hand-picked so the
 * scale reads cleanly on the InnoiNVest surface tokens.
 */
function colorFor(t: number): { fill: string; text: string } {
  // Clamp
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.2) return { fill: "#edf1f1", text: "#1a2322" };
  if (x < 0.4) return { fill: "#cbe6e3", text: "#0f3531" };
  if (x < 0.6) return { fill: "#7fd9d3", text: "#0b2b29" };
  if (x < 0.8) return { fill: "#45afaa", text: "#ffffff" };
  return { fill: "#125959", text: "#ffffff" };
}

const SHORT_NAME: Record<string, string> = {
  "393": "Satu Mare",
  "275": "Maramureș",
  "402": "Sălaj",
  "63": "Bistrița-N",
  "54": "Bihor",
  "120": "Cluj",
};

/**
 * Hex cartogram of NW Romania's six counties, color-coded by the
 * provided metric values. Hovering a hex reveals the precise value.
 */
export function MapBlock({ kpiCode, year, valuesByCounty }: Props) {
  const kpi = getKpi(kpiCode);
  const isComposite = kpiCode === "composite_score";

  const { min, max } = useMemo(() => {
    const vals = Object.values(valuesByCounty);
    if (vals.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [valuesByCounty]);

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          {isComposite ? "Investment score" : (kpi?.nameEn ?? kpiCode)} — NW Romania
        </p>
        <p className="font-label-md text-label-md text-on-surface-variant">{year}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label={`Map of ${kpi?.nameEn ?? kpiCode} across NW Romania counties, ${year}`}
          className="w-full max-w-[300px]"
        >
          {HEX_POSITIONS.map(({ sirutaCode, cx, cy }) => {
            const v = valuesByCounty[sirutaCode];
            const hasValue = v !== undefined;
            const t = hasValue ? (max === min ? 0.5 : (v - min) / (max - min)) : 0;
            const { fill, text } = hasValue
              ? colorFor(t)
              : { fill: "#f3f6f6", text: "#6c7a78" };
            const loc = LOCATIONS.find((l) => l.sirutaCode === sirutaCode);
            const label = SHORT_NAME[sirutaCode] ?? loc?.name ?? sirutaCode;
            const valueText = hasValue
              ? isComposite
                ? v.toFixed(0)
                : v.toLocaleString("en-US", {
                    maximumFractionDigits: v < 100 ? 1 : 0,
                    notation: v >= 100_000 ? "compact" : "standard",
                  })
              : "—";

            return (
              <g key={sirutaCode}>
                <path
                  d={hexPath(cx, cy, HEX_SIZE)}
                  fill={fill}
                  stroke="var(--color-border-subtle)"
                  strokeWidth={1}
                >
                  <title>
                    {loc?.name ?? label}: {valueText} {kpi?.unit ?? ""}
                  </title>
                </path>
                <text
                  x={cx}
                  y={cy - 3}
                  textAnchor="middle"
                  className="pointer-events-none text-[9px] font-semibold"
                  fill={text}
                >
                  {label}
                </text>
                <text
                  x={cx}
                  y={cy + 10}
                  textAnchor="middle"
                  className="pointer-events-none text-[10px] tabular-nums"
                  fill={text}
                >
                  {valueText}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-col justify-end gap-1 text-on-surface-variant">
          <p className="font-label-md text-label-md mb-0.5 uppercase tracking-wider">Scale</p>
          <div className="flex items-center gap-2">
            <div className="flex h-2.5 w-32 overflow-hidden rounded-full ring-1 ring-border-subtle">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((t) => (
                <div key={t} className="flex-1" style={{ backgroundColor: colorFor(t).fill }} />
              ))}
            </div>
          </div>
          <p className="font-label-md text-label-md tabular-nums">
            {min.toLocaleString("en-US", { maximumFractionDigits: 1, notation: max >= 100_000 ? "compact" : "standard" })}{" "}
            →{" "}
            {max.toLocaleString("en-US", { maximumFractionDigits: 1, notation: max >= 100_000 ? "compact" : "standard" })}
          </p>
        </div>
      </div>
    </div>
  );
}
