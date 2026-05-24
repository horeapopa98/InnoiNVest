"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getKpi } from "@/lib/mock/kpis";
import { NW_COUNTIES_GEOJSON } from "@/lib/mock/nw-counties-geo";

type Props = {
  kpiCode: string;
  year: number;
  valuesByCounty: Record<string, number>;
};

/**
 * Map-tile-backed choropleth of the six NW Romania counties. The
 * county outlines come from a hand-traced GeoJSON; fill colour
 * encodes the metric value using a 5-stop teal ramp aligned with the
 * brand palette. Hovering a county highlights it; the tooltip + side
 * legend show the precise value.
 */
function colourFor(t: number): string {
  // Clamp 0..1
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.2) return "#edf1f1";
  if (x < 0.4) return "#cbe6e3";
  if (x < 0.6) return "#7fd9d3";
  if (x < 0.8) return "#45afaa";
  return "#125959";
}

function readableTextFor(fill: string): string {
  return ["#edf1f1", "#cbe6e3"].includes(fill) ? "#1a2322" : "#ffffff";
}

export function MapBlock({ kpiCode, year, valuesByCounty }: Props) {
  const kpi = getKpi(kpiCode);
  const isComposite = kpiCode === "composite_score";
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const labelLayerRef = useRef<L.LayerGroup | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const { min, max } = useMemo(() => {
    const vals = Object.values(valuesByCounty);
    if (vals.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [valuesByCounty]);

  // One-time map init.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomSnap: 0.25,
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
      layerRef.current = null;
      labelLayerRef.current = null;
    };
  }, []);

  // (Re)draw the choropleth when values change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
    if (labelLayerRef.current) {
      labelLayerRef.current.remove();
      labelLayerRef.current = null;
    }

    const features = NW_COUNTIES_GEOJSON.features;
    const layer = L.geoJSON(NW_COUNTIES_GEOJSON, {
      style: (feature) => {
        const siruta = (feature?.properties as { siruta?: string } | undefined)?.siruta ?? "";
        const v = valuesByCounty[siruta];
        const t = v === undefined ? 0 : max === min ? 0.5 : (v - min) / (max - min);
        return {
          color: "#125959",
          weight: 1.4,
          opacity: 0.9,
          fillColor: v === undefined ? "#f3f6f6" : colourFor(t),
          fillOpacity: 0.78,
        };
      },
      onEachFeature: (feature, lyr) => {
        const siruta = (feature.properties as { siruta?: string }).siruta ?? "";
        const name = (feature.properties as { name?: string }).name ?? siruta;
        const v = valuesByCounty[siruta];
        const valueText =
          v === undefined
            ? "no data"
            : isComposite
              ? `${v.toFixed(1)} / 100`
              : `${v.toLocaleString("en-US", { maximumFractionDigits: v < 100 ? 1 : 0 })} ${kpi?.unit ?? ""}`;
        lyr.bindTooltip(`<strong>${name}</strong><br/>${valueText}`, {
          sticky: true,
          direction: "top",
        });
        lyr.on("mouseover", (e) => {
          (e.target as L.Path).setStyle({ weight: 3, color: "#06342f" });
          setHovered(siruta);
        });
        lyr.on("mouseout", (e) => {
          layer.resetStyle(e.target as L.Path);
          setHovered(null);
        });
      },
    }).addTo(map);
    layerRef.current = layer;

    // Add a labels layer with the value rendered at each polygon's centroid.
    const labels = L.layerGroup();
    for (const feature of features) {
      const siruta = (feature.properties as { siruta?: string }).siruta ?? "";
      const v = valuesByCounty[siruta];
      if (v === undefined) continue;
      const t = max === min ? 0.5 : (v - min) / (max - min);
      const fill = colourFor(t);
      const text = readableTextFor(fill);
      const ring = polygonCentroid(feature.geometry.coordinates[0] as [number, number][]);
      const valueText = isComposite
        ? v.toFixed(0)
        : v.toLocaleString("en-US", {
            maximumFractionDigits: v < 100 ? 1 : 0,
            notation: v >= 100_000 ? "compact" : "standard",
          });
      const html = `<div style="
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-family:inherit;color:${text};text-align:center;line-height:1.1;
        text-shadow:0 1px 1px rgba(0,0,0,.18);pointer-events:none;
      ">
        <div style="font-size:9px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;opacity:.85;">${(feature.properties as { name?: string }).name ?? ""}</div>
        <div style="font-size:13px;font-weight:700;">${valueText}</div>
      </div>`;
      const icon = L.divIcon({
        html,
        className: "innoinvest-county-label",
        iconSize: [70, 28],
        iconAnchor: [35, 14],
      });
      const marker = L.marker([ring[1], ring[0]], { icon, interactive: false });
      labels.addLayer(marker);
    }
    labels.addTo(map);
    labelLayerRef.current = labels;

    map.fitBounds(layer.getBounds().pad(0.05), { animate: false });
  }, [valuesByCounty, min, max, isComposite, kpi]);

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
          {isComposite ? "Investment score" : (kpi?.nameEn ?? kpiCode)} — NW Romania
        </p>
        <p className="font-label-md text-label-md text-on-surface-variant">
          {year} · choropleth on OpenStreetMap
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
        <div
          ref={containerRef}
          className="z-0 h-[320px] w-full overflow-hidden rounded border border-border-subtle"
          aria-label={`Choropleth of ${kpi?.nameEn ?? kpiCode} across NW Romania counties, ${year}`}
        />

        <div className="flex flex-col gap-2 text-on-surface-variant">
          <p className="font-label-md text-label-md uppercase tracking-wider">Scale</p>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full ring-1 ring-border-subtle">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((t) => (
              <div key={t} className="flex-1" style={{ backgroundColor: colourFor(t) }} />
            ))}
          </div>
          <p className="font-label-md text-label-md tabular-nums">
            {min.toLocaleString("en-US", { maximumFractionDigits: 1, notation: max >= 100_000 ? "compact" : "standard" })}{" "}
            →{" "}
            {max.toLocaleString("en-US", { maximumFractionDigits: 1, notation: max >= 100_000 ? "compact" : "standard" })}
            {kpi?.unit ? ` ${kpi.unit}` : ""}
          </p>
          {hovered && (
            <p className="font-body-sm text-body-sm mt-2 text-on-surface">
              <strong>{NW_COUNTIES_GEOJSON.features.find((f) => f.id === hovered)?.properties.name}</strong>
              <br />
              {valuesByCounty[hovered] !== undefined
                ? isComposite
                  ? `${valuesByCounty[hovered].toFixed(1)} / 100`
                  : `${valuesByCounty[hovered].toLocaleString("en-US", { maximumFractionDigits: 1 })} ${kpi?.unit ?? ""}`
                : "no data"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Centroid by simple average of polygon vertices — sufficient for label placement. */
function polygonCentroid(coords: [number, number][]): [number, number] {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of coords) {
    sx += x;
    sy += y;
  }
  return [sx / coords.length, sy / coords.length];
}
