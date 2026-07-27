"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { LocationWithStats } from "@/lib/types";

const freeIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#16a34a;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.2)"></div>`,
  iconSize: [14, 14],
});
const paidIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#d63868;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.2)"></div>`,
  iconSize: [14, 14],
});
const meIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #2563eb"></div>`,
  iconSize: [16, 16],
});

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom());
  }, [lat, lon, map]);
  return null;
}

export default function MapView({
  locations,
  userPos,
  selectedId,
  onSelect,
}: {
  locations: LocationWithStats[];
  userPos: { lat: number; lon: number } | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const center = userPos ?? { lat: 52.1326, lon: 5.2913 };

  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={userPos ? 14 : 7}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> bijdragers'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userPos && <Recenter lat={userPos.lat} lon={userPos.lon} />}
      {userPos && (
        <Marker position={[userPos.lat, userPos.lon]} icon={meIcon}>
          <Popup>Jouw locatie</Popup>
        </Marker>
      )}
      {locations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.lat, loc.lon]}
          icon={loc.paid ? paidIcon : freeIcon}
          eventHandlers={{ click: () => onSelect(loc.id) }}
        >
          <Popup>
            <strong>{loc.name}</strong>
            <br />
            {loc.paid ? "Betaald" : "Gratis"}
            {loc.stats.avgStars !== null && <> · {loc.stats.avgStars}★</>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
