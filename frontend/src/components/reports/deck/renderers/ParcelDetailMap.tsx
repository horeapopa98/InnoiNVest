"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getParcel } from "@/lib/mock/parcels";

type Props = { parcelId: string };

const icon = L.divIcon({
  className: "",
  html: '<div style="background:#f5a623;border:2px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 1px 2px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function ParcelDetailMap({ parcelId }: Props) {
  const p = getParcel(parcelId);
  if (!p) return null;
  return (
    <MapContainer
      center={[p.lat, p.lng]}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      attributionControl={false}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={18}
      />
      <Marker position={[p.lat, p.lng]} icon={icon}>
        <Popup>{p.name}</Popup>
      </Marker>
    </MapContainer>
  );
}
