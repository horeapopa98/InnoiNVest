"use client";

import { MapContainer, TileLayer, Marker, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getParcel } from "@/lib/mock/parcels";

type Props = { parcelId: string };

const parcelIcon = L.divIcon({
  className: "",
  html: '<div style="background:#157777;border:2px solid #fff;border-radius:50%;width:16px;height:16px;box-shadow:0 1px 2px rgba(0,0,0,.4)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function InfrastructureMap({ parcelId }: Props) {
  const p = getParcel(parcelId);
  if (!p) return null;
  return (
    <MapContainer
      center={[p.lat, p.lng]}
      zoom={9}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      attributionControl={false}
    >
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={18} />
      <Marker position={[p.lat, p.lng]} icon={parcelIcon}>
        <Popup>{p.name}</Popup>
      </Marker>
      <CircleMarker
        center={[p.lat, p.lng]}
        radius={50}
        pathOptions={{ color: "#f5a623", weight: 2, fill: false }}
      />
    </MapContainer>
  );
}
