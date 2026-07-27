"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import LocationCard from "@/components/LocationCard";
import LocationDetail from "@/components/LocationDetail";
import type { LocationWithStats } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-gray-400">Kaart laden…</div>,
});

type WildplasCheck = {
  magWaarschijnlijk: boolean;
  uitleg: string;
} | null;

export default function Home() {
  const [locations, setLocations] = useState<LocationWithStats[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [wildplasCheck, setWildplasCheck] = useState<WildplasCheck>(null);

  async function loadLocations(lat?: number, lon?: number) {
    setStatus("loading");
    setErrorMsg("");
    try {
      const url = lat !== undefined ? `/api/locations?lat=${lat}&lon=${lon}` : "/api/locations";
      const res = await fetch(url);
      const data = await res.json();
      setLocations(data.locations ?? []);
      setStatus("done");

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

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedId) ?? null,
    [locations, selectedId]
  );

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-rose-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-rose-600">🚺 Gratis Plassen</h1>
            <p className="text-sm text-gray-500">Vind een damestoilet bij jou in de buurt — gratis of betaald.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={useMyLocation}
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              📍 Gebruik mijn locatie
            </button>
            <form onSubmit={submitManual} className="flex gap-2">
              <input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="of typ een adres/plaats"
                className="rounded-full border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-full border border-rose-300 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                Zoek
              </button>
            </form>
          </div>
        </div>
        {errorMsg && <p className="mx-auto mt-2 max-w-6xl text-sm text-red-600">{errorMsg}</p>}
      </header>

      {wildplasCheck && (
        <div
          className={`mx-auto mt-3 w-full max-w-6xl rounded-lg px-4 py-2 text-sm ${
            wildplasCheck.magWaarschijnlijk ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
          }`}
        >
          Geen toilet vlakbij. {wildplasCheck.uitleg} (geen juridisch advies)
        </div>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        <div className="flex w-full flex-col gap-3 lg:w-[380px]">
          {status === "loading" && <p className="text-sm text-gray-400">Laden…</p>}
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              selected={loc.id === selectedId}
              onClick={() => setSelectedId(loc.id)}
            />
          ))}
        </div>

        <div className="relative h-[70vh] w-full overflow-hidden rounded-xl border border-gray-200 lg:h-auto lg:flex-1">
          <MapView
            locations={locations}
            userPos={userPos}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>

      {selectedLocation && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setSelectedId(null)}>
          <div
            className="h-full w-full max-w-md bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <LocationDetail
              location={selectedLocation}
              onClose={() => setSelectedId(null)}
              onReviewSubmitted={() => loadLocations(userPos?.lat, userPos?.lon)}
            />
          </div>
        </div>
      )}

      <footer className="mt-auto border-t border-gray-100 px-4 py-6 text-center text-xs text-gray-400">
        Locatiedata: eigen selectie + OpenStreetMap. Reviews door bezoekers — check zelf ter plekke.
        Geen account nodig; anonieme reviews met beperkte snelheid om misbruik tegen te gaan.
      </footer>
    </main>
  );
}
