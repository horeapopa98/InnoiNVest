"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Marker = {
  lat: number;
  lng: number;
  name: string;
  type: "park" | "airport" | "railway" | "university" | "border";
};

type Props = {
  lat: number;
  lng: number;
  label: string;
  radius_km?: number;
  markers?: Marker[];
  /** Override the height of the Leaflet map canvas. Defaults to "320px". */
  mapHeight?: string;
};

// ─── marker styles ────────────────────────────────────────────────────────────

const TYPE_STYLE: Record<
  Marker["type"],
  { color: string; emoji: string; label: string }
> = {
  park:       { color: "#06a59b", emoji: "🏭", label: "Industrial Park" },
  airport:    { color: "#3f51b5", emoji: "✈️", label: "Airport" },
  railway:    { color: "#d97706", emoji: "🚆", label: "Railway Station" },
  university: { color: "#7c3aed", emoji: "🎓", label: "University" },
  border:     { color: "#64748b", emoji: "🛂", label: "Border Crossing" },
};

function makeIcon(type: Marker["type"]): L.DivIcon {
  const { color } = TYPE_STYLE[type];
  const html = `<div style="
    width:22px;height:22px;border-radius:50%;
    background:${color};
    border:2px solid #fff;
    box-shadow:0 1px 5px rgba(0,0,0,.4);
  "></div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function makeCenterIcon(label: string): L.DivIcon {
  const html = `<div style="
    display:flex;align-items:center;gap:4px;
    background:#1e3a5f;color:#fff;
    font:600 11px/1.2 sans-serif;
    padding:4px 7px;border-radius:12px;
    box-shadow:0 2px 8px rgba(0,0,0,.45);
    white-space:nowrap;
  ">📍 ${label}</div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: undefined,
    iconAnchor: [0, 0],
  });
}

// ─── component ────────────────────────────────────────────────────────────────

export function LocationMapBlock({ lat, lng, label, radius_km = 30, markers = [], mapHeight = "320px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Radius circle
    L.circle([lat, lng], {
      radius: radius_km * 1000,
      color: "#06a59b",
      weight: 1.5,
      fillColor: "#06a59b",
      fillOpacity: 0.06,
      dashArray: "5,4",
    }).addTo(map);

    // Center marker
    L.marker([lat, lng], { icon: makeCenterIcon(label), zIndexOffset: 1000 })
      .addTo(map);

    // Infra markers — skip any with missing/invalid coordinates
    for (const m of markers) {
      if (m.lat == null || m.lng == null || isNaN(m.lat) || isNaN(m.lng)) continue;
      L.marker([m.lat, m.lng], { icon: makeIcon(m.type) })
        .addTo(map)
        .bindPopup(`<strong>${m.name}</strong><br/><small>${TYPE_STYLE[m.type].label}</small>`);
    }

    // Fit bounds to include center + all valid markers
    const validMarkers = markers.filter(
      (m) => m.lat != null && m.lng != null && !isNaN(m.lat) && !isNaN(m.lng)
    );
    const allPoints: L.LatLngTuple[] = [
      [lat, lng],
      ...validMarkers.map((m) => [m.lat, m.lng] as L.LatLngTuple),
    ];
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds.pad(0.2), { animate: false, maxZoom: 12 });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive active types for legend
  const activeTypes = Array.from(new Set(markers.map((m) => m.type)));

  return (
    <div className={`flex flex-col rounded-lg border border-border-subtle bg-surface p-3 ${mapHeight === "100%" ? "h-full" : ""}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          {label} · investment map
        </p>
        <p className="font-label-md text-label-md text-on-surface-variant">
          {radius_km} km radius · OpenStreetMap
        </p>
      </div>

      <div
        ref={containerRef}
        className="z-0 w-full overflow-hidden rounded border border-border-subtle"
        style={{ height: mapHeight }}
        aria-label={`Map showing investment location: ${label}`}
      />

      {activeTypes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: "#1e3a5f" }}
            />
            Selected location
          </span>
          {activeTypes.map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: TYPE_STYLE[t].color }}
              />
              {TYPE_STYLE[t].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
