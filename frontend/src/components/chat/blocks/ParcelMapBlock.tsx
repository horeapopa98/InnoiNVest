"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Building2, Factory, Sprout, Truck } from "lucide-react";
import { getLocation } from "@/lib/mock/locations";
import {
  PARCELS,
  parcelScore,
  type Parcel,
  type ParcelType,
} from "@/lib/mock/parcels";

type Props = {
  parcelIds?: readonly string[];
  filterType?: ParcelType | "all";
};

// ---------------------------------------------------------------------
// Pin styling per parcel type. Pins use Leaflet DivIcons so they pick
// up brand-aligned colours without needing image assets.
// ---------------------------------------------------------------------

const TYPE_STYLE: Record<
  ParcelType,
  { color: string; ring: string; label: string }
> = {
  industrial: { color: "#06a59b", ring: "#125959", label: "Industrial" },
  tech: { color: "#3f51b5", ring: "#1e293b", label: "Tech" },
  logistics: { color: "#d97706", ring: "#7c2d12", label: "Logistics" },
  agricultural: { color: "#16a34a", ring: "#14532d", label: "Agricultural" },
};

const TYPE_ICON: Record<ParcelType, React.ReactNode> = {
  industrial: <Factory size={12} strokeWidth={2.5} aria-hidden="true" />,
  tech: <Building2 size={12} strokeWidth={2.5} aria-hidden="true" />,
  logistics: <Truck size={12} strokeWidth={2.5} aria-hidden="true" />,
  agricultural: <Sprout size={12} strokeWidth={2.5} aria-hidden="true" />,
};

// Inline SVG glyphs for the DivIcon — Lucide paths copied so we don't
// pay react-dom/server for marker rendering.
const TYPE_SVG: Record<ParcelType, string> = {
  industrial: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>`,
  tech: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg>`,
  logistics: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 8.38a1 1 0 0 0-.78-.38H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
  agricultural: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>`,
};

function pinIcon(type: ParcelType, selected: boolean): L.DivIcon {
  const { color, ring } = TYPE_STYLE[type];
  const size = selected ? 30 : 24;
  const html = `<div style="
    display:flex;align-items:center;justify-content:center;
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};color:#ffffff;
    box-shadow: 0 0 0 3px ${selected ? color + "55" : "#ffffffcc"}, 0 2px 6px rgba(0,0,0,.35);
    border:2px solid ${ring};
  ">${TYPE_SVG[type]}</div>`;
  return L.divIcon({
    html,
    className: "innoinvest-parcel-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Generate a deterministic cadastral-style polygon (5–7 vertices,
 * jittered) around the parcel's (lat, lng), sized to the actual
 * hectares. ~10,000 m² per ha, so side ≈ √area_m². At ~46–48°N,
 * 1° latitude ≈ 111 km and 1° longitude ≈ 76 km, so we use anisotropic
 * deg/m conversions for a realistic-looking footprint.
 */
function parcelPolygon(parcel: Parcel): L.LatLngExpression[] {
  const sideM = Math.sqrt(parcel.areaHa * 10_000);
  const halfM = sideM / 2;
  const degPerMLat = 1 / 111_000;
  const degPerMLng = 1 / (111_000 * Math.cos((parcel.lat * Math.PI) / 180));
  const halfDegLat = halfM * degPerMLat;
  const halfDegLng = halfM * degPerMLng;

  // Seeded PRNG so the polygon shape is stable across renders.
  let seed = 0;
  for (let i = 0; i < parcel.id.length; i++) seed = (seed * 31 + parcel.id.charCodeAt(i)) | 0;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return ((seed >>> 0) / 4294967296);
  };

  const n = 5 + Math.floor(rng() * 3); // 5..7 vertices
  const points: L.LatLngExpression[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.4;
    const radius = 0.7 + rng() * 0.5; // jitter the radius for irregularity
    const dLat = Math.cos(angle) * halfDegLat * radius;
    const dLng = Math.sin(angle) * halfDegLng * radius;
    points.push([parcel.lat + dLat, parcel.lng + dLng]);
  }
  return points;
}

export function ParcelMapBlock({ parcelIds, filterType = "all" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polygonRef = useRef<L.Polygon | null>(null);
  const [selected, setSelected] = useState<Parcel | null>(null);

  const visible = useMemo(() => {
    const base = parcelIds && parcelIds.length > 0
      ? PARCELS.filter((p) => parcelIds.includes(p.id))
      : [...PARCELS];
    return base.filter((p) => filterType === "all" || p.type === filterType);
  }, [parcelIds, filterType]);

  const ranked = useMemo(
    () => [...visible].sort((a, b) => parcelScore(b) - parcelScore(a)).slice(0, 5),
    [visible]
  );
  const activeTypes = Array.from(new Set(visible.map((p) => p.type)));

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false, // play nice inside a scrollable chat
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      polygonRef.current = null;
    };
  }, []);

  // Fit bounds + re-render markers when the visible set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    for (const m of markersRef.current.values()) m.remove();
    markersRef.current.clear();

    if (visible.length === 0) return;

    for (const p of visible) {
      const marker = L.marker([p.lat, p.lng], {
        icon: pinIcon(p.type, false),
        title: p.name,
        riseOnHover: true,
      });
      marker.on("click", () => setSelected(p));
      marker.addTo(map);
      markersRef.current.set(p.id, marker);
    }

    const bounds = L.latLngBounds(visible.map((p) => [p.lat, p.lng] as L.LatLngTuple));
    map.fitBounds(bounds.pad(0.18), { animate: false });
  }, [visible]);

  // Highlight selected parcel: swap its icon, draw cadastral polygon, pan.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Reset all marker icons
    for (const [id, marker] of markersRef.current) {
      const parcel = visible.find((p) => p.id === id);
      if (!parcel) continue;
      marker.setIcon(pinIcon(parcel.type, id === selected?.id));
    }

    // Replace polygon
    if (polygonRef.current) {
      polygonRef.current.remove();
      polygonRef.current = null;
    }
    if (selected) {
      const style = TYPE_STYLE[selected.type];
      polygonRef.current = L.polygon(parcelPolygon(selected), {
        color: style.ring,
        weight: 2,
        fillColor: style.color,
        fillOpacity: 0.25,
        dashArray: "4,3",
      }).addTo(map);
      // Smoothly fly to the selected parcel and zoom in a bit.
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 11), {
        duration: 0.4,
      });
    }
  }, [selected, visible]);

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          Investable parcels · NW Romania
        </p>
        <p className="font-label-md text-label-md text-on-surface-variant">
          {visible.length} {visible.length === 1 ? "parcel" : "parcels"} · OpenStreetMap
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_280px]">
        <div
          ref={containerRef}
          className="z-0 h-[320px] w-full overflow-hidden rounded border border-border-subtle"
          aria-label="Map of investable parcels in NW Romania"
        />

        <div className="flex flex-col gap-3">
          <div>
            <p className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
              Legend
            </p>
            <ul className="grid grid-cols-2 gap-1">
              {activeTypes.map((t) => (
                <li
                  key={t}
                  className="font-label-md text-label-md inline-flex items-center gap-1.5 text-on-surface-variant"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex h-3 w-3 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: TYPE_STYLE[t].color }}
                  >
                    {TYPE_ICON[t]}
                  </span>
                  {TYPE_STYLE[t].label}
                </li>
              ))}
            </ul>
          </div>

          {selected ? (
            <ParcelDetail parcel={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="rounded border border-dashed border-border-subtle p-3 text-xs text-on-surface-variant">
              Tap a pin to highlight the parcel — the map zooms in and draws
              a cadastral-style outline scaled to the actual hectares.
            </div>
          )}
        </div>
      </div>

      {ranked.length > 1 && (
        <div className="mt-3 border-t border-border-subtle pt-3">
          <p className="font-label-md text-label-md mb-2 uppercase tracking-wider text-on-surface-variant">
            Top {ranked.length} parcels by composite score
          </p>
          <ul className="divide-y divide-border-subtle/60">
            {ranked.map((p, i) => {
              const score = parcelScore(p);
              const county = getLocation(p.countySiruta);
              const style = TYPE_STYLE[p.type];
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 py-2"
                >
                  <span className="font-label-md text-label-md text-center text-on-surface-variant">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected(p)}
                    className="min-w-0 text-left"
                  >
                    <p className="font-body-sm text-body-sm truncate font-medium text-on-surface group-hover:text-primary-deep">
                      {p.name}
                    </p>
                    <p className="font-label-md text-label-md flex items-center gap-2 text-on-surface-variant">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: style.color }}
                      />
                      {style.label} · {county?.name} · {p.areaHa} ha
                    </p>
                  </button>
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
  const style = TYPE_STYLE[parcel.type];
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
          className="inline-flex h-3 w-3 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: style.color }}
        >
          {TYPE_ICON[parcel.type]}
        </span>
        {style.label} · {county?.name}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-on-surface-variant">
        <dt>Area</dt>
        <dd className="text-right tabular-nums text-on-surface">{parcel.areaHa} ha</dd>
        <dt>Price</dt>
        <dd className="text-right tabular-nums text-on-surface">
          €{(parcel.pricePerHaEur / 1000).toFixed(0)}k/ha
        </dd>
        <dt>Status</dt>
        <dd className="text-right capitalize text-on-surface">{parcel.status}</dd>
        <dt>Highway</dt>
        <dd className="text-right tabular-nums text-on-surface">{parcel.highwayKm} km</dd>
        <dt>Rail</dt>
        <dd className="text-right tabular-nums text-on-surface">{parcel.railKm} km</dd>
        <dt>Utilities</dt>
        <dd className="text-right text-on-surface">
          {["—", "Basic", "Good", "Full"][parcel.utilitiesScore]}
        </dd>
      </dl>
      <p className="font-body-sm text-body-sm mt-2 text-on-surface-variant">
        {parcel.description}
      </p>
    </div>
  );
}
