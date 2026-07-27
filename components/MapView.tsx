"use client";

import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents } from "react-leaflet";
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

// Google/Apple Maps style teardrop pin, rendered as an inline SVG DivIcon so
// we can recolor and resize it per marker state without shipping image assets.
function pinIcon(color: string, selected: boolean): L.DivIcon {
  const w = selected ? 34 : 26;
  const h = Math.round(w * 1.33);
  const ring = selected ? `<circle cx="12" cy="12" r="11" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.35"/>` : "";
  return new L.DivIcon({
    className: "gp-pin",
    html: `<svg width="${w}" height="${h}" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 4px rgba(0,0,0,.35))">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="${color}"/>
      <circle cx="12" cy="12" r="5.5" fill="white"/>
      ${ring}
    </svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h * 0.9],
  });
}

const FREE_COLOR = "#16a34a";
const PAID_COLOR = "#d63868";
const UNKNOWN_COLOR = "#78716c";

function colorFor(loc: LocationWithStats): string {
  if (loc.paid === false) return FREE_COLOR;
  if (loc.paid === true) return PAID_COLOR;
  return UNKNOWN_COLOR;
}

const meIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #2563eb, 0 2px 6px rgba(0,0,0,.35)"></div>`,
  iconSize: [16, 16],
});

// Pans/zooms to a location picked from the list (or a marker click) without
// fighting the user's own pan/zoom gestures on every render.
function FlyToSelected({ location }: { location: { lat: number; lon: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!location) return;
    map.flyTo([location.lat, location.lon], Math.max(map.getZoom(), 15), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lon]);
  return null;
}

export type SearchFocus = {
  lat: number;
  lon: number;
  points: { lat: number; lon: number }[];
  key: number;
};

// Zooms to fit the toilets closest to a searched/located point after "Gebruik
// mijn locatie" or an address search. `points` is already limited (by the
// caller) to the nearest ones within a bikeable radius, so fitting bounds to
// them naturally caps how far out the map zooms — it only zooms in tighter
// when those points are close together.
function FocusOnSearch({ focus }: { focus: SearchFocus | null }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    if (focus.points.length === 0) {
      map.setView([focus.lat, focus.lon], 14);
      return;
    }
    const bounds = L.latLngBounds([[focus.lat, focus.lon]]);
    focus.points.forEach((p) => bounds.extend([p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);
  return null;
}

// leaflet.markercluster groups thousands of markers into small cluster
// bubbles that split apart on zoom, so the map stays smooth however many
// locations are loaded (the dataset now covers all of NL, ~4000 pins).
function ClusteredMarkers({
  locations,
  selectedId,
  onSelect,
}: {
  locations: LocationWithStats[];
  selectedId: string | null;
  onSelect: (loc: LocationWithStats) => void;
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
      const selected = loc.id === selectedId;
      const marker = L.marker([loc.lat, loc.lon], {
        icon: pinIcon(colorFor(loc), selected),
        zIndexOffset: selected ? 1000 : 0,
      });
      marker.on("click", () => onSelect(loc));
      return marker;
    });
    clusterGroup.addLayers(markers);
  }, [locations, selectedId, onSelect]);

  return null;
}

export default function MapView({
  locations,
  userPos,
  selectedId,
  selectedLocation,
  searchFocus,
  onSelect,
  onBoundsChange,
}: {
  locations: LocationWithStats[];
  userPos: { lat: number; lon: number } | null;
  selectedId: string | null;
  selectedLocation?: { lat: number; lon: number } | null;
  searchFocus?: SearchFocus | null;
  onSelect: (loc: LocationWithStats) => void;
  onBoundsChange: (bounds: MapBounds) => void;
}) {
  const center = userPos ?? { lat: 52.1326, lon: 5.2913 };

  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={userPos ? 14 : 7}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      <BoundsWatcher onBoundsChange={onBoundsChange} />
      {searchFocus && <FocusOnSearch focus={searchFocus} />}
      {selectedLocation && <FlyToSelected location={selectedLocation} />}
      {userPos && (
        <Marker position={[userPos.lat, userPos.lon]} icon={meIcon}>
          <Popup>Jouw locatie</Popup>
        </Marker>
      )}
      <ClusteredMarkers locations={locations} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  );
}
