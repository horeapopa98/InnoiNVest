"use client";

import { useMemo, useState } from "react";
import { Building2, Factory, Sprout, Truck } from "lucide-react";
import { getLocation } from "@/lib/mock/locations";
import {
  PARCELS,
  parcelScore,
  type Parcel,
  type ParcelType,
} from "@/lib/mock/parcels";

type Props = {
  /** Parcel ids to feature on the map. If empty, shows all parcels. */
  parcelIds?: readonly string[];
  /** Optional sector filter (renders only matching parcel types). */
  filterType?: ParcelType | "all";
};

// ---------------------------------------------------------------------
// NW Romania outline (hand-traced approximate WGS84 → SVG coords).
// Bounding box: lat 46.3..48.05, lng 21.3..25.3
// ---------------------------------------------------------------------

const BBOX = { latMin: 46.3, latMax: 48.05, lngMin: 21.3, lngMax: 25.3 };
const VIEW_W = 380;
const VIEW_H = 220;

function projX(lng: number): number {
  return ((lng - BBOX.lngMin) / (BBOX.lngMax - BBOX.lngMin)) * VIEW_W;
}
function projY(lat: number): number {
  return ((BBOX.latMax - lat) / (BBOX.latMax - BBOX.latMin)) * VIEW_H;
}

/** Approximate NW Romania outline as lat/lng points, clockwise from NE. */
const OUTLINE_LATLNG: Array<[number, number]> = [
  [47.98, 23.55],
  [47.98, 24.05],
  [47.92, 24.55],
  [47.75, 24.95],
  [47.55, 25.15],
  [47.25, 25.20],
  [47.05, 25.05],
  [46.85, 24.80],
  [46.65, 24.55],
  [46.50, 24.20],
  [46.45, 23.75],
  [46.45, 23.30],
  [46.50, 22.80],
  [46.60, 22.30],
  [46.55, 21.80],
  [46.65, 21.45],
  [46.95, 21.35],
  [47.25, 21.35],
  [47.50, 21.55],
  [47.70, 21.85],
  [47.85, 22.15],
  [47.95, 22.55],
  [47.95, 23.00],
  [47.98, 23.55],
];

const OUTLINE_PATH = OUTLINE_LATLNG.map(
  ([lat, lng], i) => `${i === 0 ? "M" : "L"}${projX(lng).toFixed(1)},${projY(lat).toFixed(1)}`
).join(" ") + " Z";

// ---------------------------------------------------------------------
// County label anchors — approximate centroids
// ---------------------------------------------------------------------

const COUNTY_LABELS: Array<{ siruta: string; name: string; lat: number; lng: number }> = [
  { siruta: "393", name: "Satu Mare", lat: 47.78, lng: 22.45 },
  { siruta: "275", name: "Maramureș", lat: 47.70, lng: 24.10 },
  { siruta: "54", name: "Bihor", lat: 46.95, lng: 22.05 },
  { siruta: "402", name: "Sălaj", lat: 47.25, lng: 23.10 },
  { siruta: "120", name: "Cluj", lat: 46.80, lng: 23.55 },
  { siruta: "63", name: "Bistrița-Năsăud", lat: 47.20, lng: 24.55 },
];

// ---------------------------------------------------------------------
// Type → icon and color
// ---------------------------------------------------------------------

const TYPE_COLOR: Record<ParcelType, { fill: string; stroke: string; label: string }> = {
  industrial: { fill: "#06a59b", stroke: "#125959", label: "Industrial" },
  tech: { fill: "#3f51b5", stroke: "#1e293b", label: "Tech" },
  logistics: { fill: "#d97706", stroke: "#7c2d12", label: "Logistics" },
  agricultural: { fill: "#16a34a", stroke: "#14532d", label: "Agricultural" },
};

const TYPE_ICON: Record<ParcelType, React.ReactNode> = {
  industrial: <Factory size={11} aria-hidden="true" />,
  tech: <Building2 size={11} aria-hidden="true" />,
  logistics: <Truck size={11} aria-hidden="true" />,
  agricultural: <Sprout size={11} aria-hidden="true" />,
};

/**
 * Real(-ish) map of NW Romania showing investable parcels with type-
 * coded pins. Click a pin to see parcel details.
 */
export function ParcelMapBlock({ parcelIds, filterType = "all" }: Props) {
  const [selected, setSelected] = useState<Parcel | null>(null);

  const visible = useMemo(() => {
    const base = parcelIds && parcelIds.length > 0
      ? PARCELS.filter((p) => parcelIds.includes(p.id))
      : [...PARCELS];
    return base.filter((p) => filterType === "all" || p.type === filterType);
  }, [parcelIds, filterType]);

  // Show 5 best-scoring parcels as a ranked list below the map.
  const ranked = useMemo(
    () => [...visible].sort((a, b) => parcelScore(b) - parcelScore(a)).slice(0, 5),
    [visible]
  );

  const activeTypes = Array.from(new Set(visible.map((p) => p.type)));

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          Investable parcels · NW Romania
        </p>
        <p className="font-label-md text-label-md text-on-surface-variant">
          {visible.length} {visible.length === 1 ? "parcel" : "parcels"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_280px]">
        {/* Map */}
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="Map of investable parcels in NW Romania"
          className="w-full max-w-[380px] rounded border border-border-subtle/60 bg-[#f3f6f6]"
        >
          {/* Subtle grid for cartographic feel */}
          <defs>
            <pattern id="parcel-grid" width="38" height="22" patternUnits="userSpaceOnUse">
              <path d="M38 0 L0 0 0 22" fill="none" stroke="#dfe4e4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={VIEW_W} height={VIEW_H} fill="url(#parcel-grid)" />

          {/* NW Romania outline */}
          <path
            d={OUTLINE_PATH}
            fill="#ffffff"
            stroke="#125959"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />

          {/* County labels */}
          {COUNTY_LABELS.map((c) => (
            <text
              key={c.siruta}
              x={projX(c.lng)}
              y={projY(c.lat)}
              textAnchor="middle"
              className="pointer-events-none fill-on-surface-variant/60 text-[8px] uppercase tracking-widest"
            >
              {c.name}
            </text>
          ))}

          {/* Parcel pins */}
          {visible.map((p) => {
            const c = TYPE_COLOR[p.type];
            const x = projX(p.lng);
            const y = projY(p.lat);
            const isSelected = selected?.id === p.id;
            const r = Math.min(8, 3 + p.areaHa / 30);
            return (
              <g key={p.id} onClick={() => setSelected(p)} className="cursor-pointer">
                <circle
                  cx={x}
                  cy={y}
                  r={r + (isSelected ? 3 : 1)}
                  fill={c.fill}
                  fillOpacity={isSelected ? 0.25 : 0.15}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <title>
                  {p.name} — {p.areaHa} ha, {(p.pricePerHaEur / 1000).toFixed(0)}k EUR/ha
                </title>
              </g>
            );
          })}
        </svg>

        {/* Right: selected parcel or legend */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
              Legend
            </p>
            <ul className="grid grid-cols-2 gap-1">
              {Object.entries(TYPE_COLOR)
                .filter(([k]) => activeTypes.includes(k as ParcelType))
                .map(([k, c]) => (
                  <li
                    key={k}
                    className="font-label-md text-label-md inline-flex items-center gap-1.5 text-on-surface-variant"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex h-3 w-3 items-center justify-center rounded-full"
                      style={{ backgroundColor: c.fill }}
                    >
                      <span className="text-white">{TYPE_ICON[k as ParcelType]}</span>
                    </span>
                    {c.label}
                  </li>
                ))}
            </ul>
          </div>

          {selected ? (
            <ParcelDetail parcel={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="rounded border border-dashed border-border-subtle p-3 text-xs text-on-surface-variant">
              Tap a pin for parcel details — area, price, infrastructure scoring.
            </div>
          )}
        </div>
      </div>

      {/* Top 5 ranking */}
      {ranked.length > 1 && (
        <div className="mt-3 border-t border-border-subtle pt-3">
          <p className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
            Top {ranked.length} parcels by composite score
          </p>
          <ul className="divide-y divide-border-subtle/60">
            {ranked.map((p, i) => {
              const score = parcelScore(p);
              const county = getLocation(p.countySiruta);
              const c = TYPE_COLOR[p.type];
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 py-2"
                >
                  <span className="font-label-md text-label-md text-center text-on-surface-variant">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-body-sm text-body-sm truncate font-medium text-on-surface">
                      {p.name}
                    </p>
                    <p className="font-label-md text-label-md flex items-center gap-2 text-on-surface-variant">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: c.fill }}
                      />
                      {c.label} · {county?.name} · {p.areaHa} ha
                    </p>
                  </div>
                  <span className="font-label-md text-label-md tabular-nums text-on-surface-variant">
                    €{(p.pricePerHaEur / 1000).toFixed(0)}k/ha
                  </span>
                  <span className="font-label-md text-label-md tabular-nums font-semibold text-primary-deep">
                    {score}/100
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function ParcelDetail({ parcel, onClose }: { parcel: Parcel; onClose: () => void }) {
  const c = TYPE_COLOR[parcel.type];
  const county = getLocation(parcel.countySiruta);
  return (
    <div className="rounded border border-border-subtle bg-surface-container-lowest p-3 text-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="font-body-sm text-body-sm font-semibold text-on-surface">{parcel.name}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          className="text-on-surface-variant hover:text-on-surface"
        >
          ×
        </button>
      </div>
      <p className="font-label-md text-label-md inline-flex items-center gap-1.5 text-on-surface-variant">
        <span
          aria-hidden="true"
          className="inline-flex h-3 w-3 items-center justify-center rounded-full"
          style={{ backgroundColor: c.fill }}
        >
          <span className="text-white">{TYPE_ICON[parcel.type]}</span>
        </span>
        {c.label} · {county?.name}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-on-surface-variant">
        <dt>Area</dt>
        <dd className="text-right text-on-surface tabular-nums">{parcel.areaHa} ha</dd>
        <dt>Price</dt>
        <dd className="text-right text-on-surface tabular-nums">
          €{(parcel.pricePerHaEur / 1000).toFixed(0)}k/ha
        </dd>
        <dt>Status</dt>
        <dd className="text-right capitalize text-on-surface">{parcel.status}</dd>
        <dt>Highway</dt>
        <dd className="text-right text-on-surface tabular-nums">{parcel.highwayKm} km</dd>
        <dt>Rail</dt>
        <dd className="text-right text-on-surface tabular-nums">{parcel.railKm} km</dd>
        <dt>Utilities</dt>
        <dd className="text-right text-on-surface">{["—", "Basic", "Good", "Full"][parcel.utilitiesScore]}</dd>
      </dl>
      <p className="font-body-sm text-body-sm mt-2 text-on-surface-variant">
        {parcel.description}
      </p>
    </div>
  );
}
