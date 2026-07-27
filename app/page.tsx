"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import LocationCard from "@/components/LocationCard";
import LocationDetail from "@/components/LocationDetail";
import AddLocationForm from "@/components/AddLocationForm";
import BottomSheet from "@/components/BottomSheet";
import type { LocationWithStats } from "@/lib/types";
import type { MapBounds } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-gray-400">Kaart laden…</div>,
});

type WildplasCheck = {
  magWaarschijnlijk: boolean;
  uitleg: string;
} | null;

// De lijst toont maximaal dit aantal — met ~4000 locaties landelijk is een
// ongelimiteerde lijst traag en oninzichtelijk. De kaart clustert zelf en
// kan wel de volledige set aan.
const LIST_LIMIT = 100;

export default function Home() {
  const [locations, setLocations] = useState<LocationWithStats[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null);
  // Holds the selected location object itself, not just an id looked up in
  // `locations` — selecting an item pans the map, which triggers a
  // bounds-based refetch that can drop the item from the (viewport-limited)
  // list. Deriving selection from that list would then silently close the
  // detail panel underneath the user.
  const [selectedLocation, setSelectedLocation] = useState<LocationWithStats | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [wildplasCheck, setWildplasCheck] = useState<WildplasCheck>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const boundsRef = useRef<MapBounds | null>(null);

  async function loadLocations(lat?: number, lon?: number) {
    setStatus("loading");
    setErrorMsg("");
    try {
      const params = new URLSearchParams();
      if (lat !== undefined && lon !== undefined) {
        params.set("lat", String(lat));
        params.set("lon", String(lon));
      }
      const bounds = boundsRef.current;
      if (bounds) {
        params.set("minLat", String(bounds.minLat));
        params.set("maxLat", String(bounds.maxLat));
        params.set("minLon", String(bounds.minLon));
        params.set("maxLon", String(bounds.maxLon));
      }
      const query = params.toString();
      const url = query ? `/api/locations?${query}` : "/api/locations";
      const res = await fetch(url);
      const data = await res.json();
      setLocations(data.locations ?? []);
      setStatus("done");
      setSelectedLocation((prev) => {
        if (!prev) return prev;
        const refreshed = (data.locations as LocationWithStats[] | undefined)?.find(
          (l) => l.id === prev.id
        );
        return refreshed ?? prev;
      });

      const nearest = data.locations?.[0];
      if (lat !== undefined && lon !== undefined && (!nearest || nearest.distanceMeters > 500)) {
        fetch(`/api/wildplas-check?lat=${lat}&lon=${lon}`)
          .then((r) => r.json())
          .then(setWildplasCheck)
          .catch(() => setWildplasCheck(null));
      } else {
        setWildplasCheck(null);
      }
    } catch {
      setErrorMsg("Kon locaties niet ophalen.");
      setStatus("error");
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  function handleBoundsChange(bounds: MapBounds) {
    boundsRef.current = bounds;
    loadLocations(userPos?.lat, userPos?.lon);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setErrorMsg("Je browser ondersteunt geen locatiebepaling.");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserPos(p);
        loadLocations(p.lat, p.lon);
      },
      () => {
        setErrorMsg("Kon je locatie niet ophalen. Geef toestemming, of typ hieronder een adres.");
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(manualInput)}`);
      if (!geoRes.ok) throw new Error("niet gevonden");
      const geo = await geoRes.json();
      const p = { lat: geo.lat, lon: geo.lon };
      setUserPos(p);
      await loadLocations(p.lat, p.lon);
    } catch {
      setErrorMsg("Kon dit adres niet vinden. Probeer een preciezer adres.");
      setStatus("error");
    }
  }

  const selectedId = selectedLocation?.id ?? null;

  const flyTarget = useMemo(
    () => (selectedLocation ? { lat: selectedLocation.lat, lon: selectedLocation.lon } : null),
    [selectedLocation]
  );

  const listedLocations = useMemo(
    () => locations.slice(0, LIST_LIMIT),
    [locations]
  );

  const list = (
    <>
      {status === "loading" && <p className="text-sm text-gray-400">Laden…</p>}
      <div className="flex flex-col gap-2">
        {listedLocations.map((loc) => (
          <LocationCard
            key={loc.id}
            location={loc}
            selected={loc.id === selectedId}
            onClick={() => setSelectedLocation(loc)}
          />
        ))}
      </div>
      {locations.length > LIST_LIMIT && (
        <p className="mt-2 text-center text-xs text-gray-400">
          {listedLocations.length} van {locations.length} getoond — zoom in op de kaart voor meer.
        </p>
      )}
    </>
  );

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-rose-50">
      {/* Map fills the whole screen; `isolate` contains Leaflet's internal
          z-index:1000 controls so they never escape and float above the
          floating panels/sheets/modals stacked on top of it. */}
      <div className="absolute inset-0 z-0 isolate">
        <MapView
          locations={locations}
          userPos={userPos}
          selectedId={selectedId}
          selectedLocation={flyTarget}
          onSelect={setSelectedLocation}
          onBoundsChange={handleBoundsChange}
        />
      </div>

      {/* Floating top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-3 sm:p-4">
        <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-2 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <h1 className="truncate text-base font-black text-rose-600 sm:text-lg">🚽 Gratis Plassen</h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="shrink-0 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 sm:text-sm"
            >
              ➕ Toilet toevoegen
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={useMyLocation}
              className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 sm:text-sm"
            >
              📍 Gebruik mijn locatie
            </button>
            <form onSubmit={submitManual} className="flex flex-1 min-w-[180px] gap-2">
              <input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="of typ een adres/plaats"
                className="w-full min-w-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs sm:text-sm"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full border border-rose-300 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 sm:text-sm"
              >
                Zoek
              </button>
            </form>
          </div>
          {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
          {wildplasCheck && (
            <div
              className={`rounded-lg px-3 py-2 text-xs ${
                wildplasCheck.magWaarschijnlijk ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
              }`}
            >
              Geen toilet vlakbij. {wildplasCheck.uitleg} (geen juridisch advies)
            </div>
          )}
        </div>
      </div>

      {/* Desktop floating list panel */}
      <div className="absolute bottom-4 left-4 top-24 z-10 hidden w-[360px] flex-col overflow-hidden rounded-2xl bg-white shadow-lg lg:flex">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">
            {locations.length} toilet{locations.length === 1 ? "" : "en"} in beeld
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {list}
          <p className="mt-3 text-center text-[11px] leading-snug text-gray-400">
            Locatiedata: eigen selectie + OpenStreetMap. Reviews door bezoekers — check zelf ter
            plekke. Geen account nodig; anonieme reviews met beperkte snelheid.
          </p>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <BottomSheet
        header={
          <h2 className="text-sm font-semibold text-gray-700">
            {locations.length} toilet{locations.length === 1 ? "" : "en"} in beeld
          </h2>
        }
      >
        {list}
        <p className="mt-3 text-center text-[11px] leading-snug text-gray-400">
          Locatiedata: eigen selectie + OpenStreetMap. Reviews door bezoekers — check zelf ter
          plekke. Geen account nodig; anonieme reviews met beperkte snelheid.
        </p>
      </BottomSheet>

      {selectedLocation && (
        <div className="fixed inset-0 z-40 flex items-end justify-end bg-black/30 lg:items-stretch" onClick={() => setSelectedLocation(null)}>
          <div
            className="max-h-[90vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-xl lg:h-full lg:max-h-none lg:max-w-md lg:rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            <LocationDetail
              location={selectedLocation}
              onClose={() => setSelectedLocation(null)}
              onReviewSubmitted={() => loadLocations(userPos?.lat, userPos?.lon)}
            />
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-40 flex items-end justify-end bg-black/30 lg:items-stretch" onClick={() => setShowAddForm(false)}>
          <div
            className="max-h-[90vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-xl lg:h-full lg:max-h-none lg:max-w-md lg:rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            <AddLocationForm
              onClose={() => setShowAddForm(false)}
              onAdded={() => loadLocations(userPos?.lat, userPos?.lon)}
            />
          </div>
        </div>
      )}
    </main>
  );
}
