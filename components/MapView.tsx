"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import type { LocationWithStats } from "@/lib/types";

export type MapBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: MapBounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLon: b.getWest(),
        maxLon: b.getEast(),
      });
    },
  });

  useEffect(() => {
    const b = map.getBounds();
    onBoundsChange({
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLon: b.getWest(),
      maxLon: b.getEast(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// leaflet.markercluster groups thousands of markers into small cluster
// bubbles that split apart on zoom, so the map stays smooth however many
// locations are loaded (the dataset now covers all of NL, ~4000 pins).
function ClusteredMarkers({
  locations,
  onSelect,
}: {
  locations: LocationWithStats[];
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
    });
    clusterRef.current = clusterGroup;
    map.addLayer(clusterGroup);
    return () => {
      map.removeLayer(clusterGroup);
      clusterRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const clusterGroup = clusterRef.current;
    if (!clusterGroup) return;
    clusterGroup.clearLayers();

    const markers = locations.map((loc) => {
      const marker = L.marker([loc.lat, loc.lon], {
        icon: loc.paid ? paidIcon : freeIcon,
      });
      const starsLine =
        loc.stats.avgStars !== null ? ` · ${loc.stats.avgStars}★` : "";
      marker.bindPopup(
        `<strong>${escapeHtml(loc.name)}</strong><br>${
          loc.paid ? "Betaald" : "Gratis"
        }${starsLine}`
      );
      marker.on("click", () => onSelect(loc.id));
      return marker;
    });
    clusterGroup.addLayers(markers);
  }, [locations, onSelect]);

  return null;
}

export default function MapView({
  locations,
  userPos,
  selectedId,
  onSelect,
  onBoundsChange,
}: {
  locations: LocationWithStats[];
  userPos: { lat: number; lon: number } | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBoundsChange: (bounds: MapBounds) => void;
}) {
  const center = userPos ?? { lat: 52.1326, lon: 5.2913 };
  void selectedId;

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
      <BoundsWatcher onBoundsChange={onBoundsChange} />
      {userPos && <Recenter lat={userPos.lat} lon={userPos.lon} />}
      {userPos && (
        <Marker position={[userPos.lat, userPos.lon]} icon={meIcon}>
          <Popup>Jouw locatie</Popup>
        </Marker>
      )}
      <ClusteredMarkers locations={locations} onSelect={onSelect} />
    </MapContainer>
  );
}
