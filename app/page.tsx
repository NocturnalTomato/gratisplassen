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
import Legend from "@/components/Legend";
import CoffeeMenu from "@/components/CoffeeMenu";
import WelcomeModal from "@/components/WelcomeModal";
import type { LocationWithStats } from "@/lib/types";
import type { MapBounds, SearchFocus } from "@/components/MapView";

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

// Na "gebruik mijn locatie" of een adreszoekopdracht zoomt de kaart in op de
// dichtstbijzijnde toiletten, maar nooit verder uit dan dit — ongeveer wat je
// in 10 minuten kunt fietsen (~15 km/u).
const BIKE_RADIUS_METERS = 2500;
const SEARCH_FOCUS_COUNT = 10;

type AddressSuggestion = { id: string; weergavenaam: string };

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
  const [pinPos, setPinPos] = useState<{ lat: number; lon: number } | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchFocus, setSearchFocus] = useState<SearchFocus | null>(null);
  const boundsRef = useRef<MapBounds | null>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  // Measured (not guessed) so the list panel below it never overlaps —
  // the top bar's height varies with viewport width (sm:p-4 padding) and
  // with its own content (error/wildplas messages growing it).
  const [topBarHeight, setTopBarHeight] = useState(0);
  const skipNextSuggestFetch = useRef(false);
  // Bumped on every loadLocations call so a slower, older request (e.g. the
  // unbounded fetch fired on search, before the bounds-restricted refetch it
  // triggers indirectly) can't overwrite state with stale/out-of-order data.
  const requestIdRef = useRef(0);

  async function loadLocations(
    lat?: number,
    lon?: number,
    opts?: { isSearch?: boolean }
  ) {
    const requestId = ++requestIdRef.current;
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
      if (requestId !== requestIdRef.current) return;
      setLocations(data.locations ?? []);
      setStatus("done");
      setSelectedLocation((prev) => {
        if (!prev) return prev;
        const refreshed = (data.locations as LocationWithStats[] | undefined)?.find(
          (l) => l.id === prev.id
        );
        return refreshed ?? prev;
      });

      if (opts?.isSearch && lat !== undefined && lon !== undefined) {
        const nearby = ((data.locations as LocationWithStats[] | undefined) ?? [])
          .filter((l) => l.distanceMeters !== null && l.distanceMeters <= BIKE_RADIUS_METERS)
          .slice(0, SEARCH_FOCUS_COUNT);
        setSearchFocus({
          lat,
          lon,
          points: nearby.map((l) => ({ lat: l.lat, lon: l.lon })),
          key: Date.now(),
        });

        // Only check this on an explicit search, using its own unfiltered
        // (bounds-free) response. A bounds-restricted reload after panning
        // would otherwise report the nearest toilet *within the current
        // viewport* — easily >500m even when real nearby toilets exist just
        // outside the pan — falsely claiming none are nearby.
        const nearest = (data.locations as LocationWithStats[] | undefined)?.[0];
        if (!nearest || nearest.distanceMeters === null || nearest.distanceMeters > 500) {
          fetch(`/api/wildplas-check?lat=${lat}&lon=${lon}`)
            .then((r) => r.json())
            .then(setWildplasCheck)
            .catch(() => setWildplasCheck(null));
        } else {
          setWildplasCheck(null);
        }
      }
    } catch {
      setErrorMsg("Kon locaties niet ophalen.");
      setStatus("error");
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const measure = () => {
      // `entry.contentRect` excludes padding, but this wrapper's visual
      // height (what the list panel needs to clear) includes its own
      // p-3/sm:p-4 padding — use the rendered box height instead.
      setTopBarHeight(el.getBoundingClientRect().height);
    };
    // ResizeObserver's spec-guaranteed initial callback isn't always reliable
    // in every environment (e.g. when the viewport is set programmatically
    // before the initial layout), so measure synchronously too.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
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
        boundsRef.current = null;
        loadLocations(p.lat, p.lon, { isSearch: true });
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
    setShowSuggestions(false);
    setStatus("loading");
    setErrorMsg("");
    try {
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(manualInput)}`);
      if (!geoRes.ok) throw new Error("niet gevonden");
      const geo = await geoRes.json();
      const p = { lat: geo.lat, lon: geo.lon };
      setUserPos(p);
      boundsRef.current = null;
      await loadLocations(p.lat, p.lon, { isSearch: true });
    } catch {
      setErrorMsg("Kon dit adres niet vinden. Probeer een preciezer adres.");
      setStatus("error");
    }
  }

  async function selectSuggestion(suggestion: AddressSuggestion) {
    skipNextSuggestFetch.current = true;
    setManualInput(suggestion.weergavenaam);
    setShowSuggestions(false);
    setSuggestions([]);
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/geocode/lookup?id=${encodeURIComponent(suggestion.id)}`);
      if (!res.ok) throw new Error("niet gevonden");
      const geo = await res.json();
      const p = { lat: geo.lat, lon: geo.lon };
      setUserPos(p);
      boundsRef.current = null;
      await loadLocations(p.lat, p.lon, { isSearch: true });
    } catch {
      setErrorMsg("Kon dit adres niet vinden. Probeer een preciezer adres.");
      setStatus("error");
    }
  }

  useEffect(() => {
    if (skipNextSuggestFetch.current) {
      skipNextSuggestFetch.current = false;
      return;
    }
    const query = manualInput.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [manualInput]);

  // Default drop point for a new pin: the user's known location, else the
  // middle of whatever the map is currently showing, else the NL centroid.
  function openAddForm() {
    const bounds = boundsRef.current;
    const fallback = bounds
      ? { lat: (bounds.minLat + bounds.maxLat) / 2, lon: (bounds.minLon + bounds.maxLon) / 2 }
      : { lat: 52.1326, lon: 5.2913 };
    setPinPos(userPos ?? fallback);
    setShowAddForm(true);
  }

  function closeAddForm() {
    setShowAddForm(false);
    setPinPos(null);
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
          searchFocus={searchFocus}
          pinPos={pinPos}
          onPinPosChange={setPinPos}
          onSelect={setSelectedLocation}
          onBoundsChange={handleBoundsChange}
        />
      </div>

      <WelcomeModal />

      {/* Floating top bar — hidden while adding a pin; the form shows its
          own logo/title instead, and the map behind must stay fully clear. */}
      {!showAddForm && (
        <div
          ref={topBarRef}
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-3 sm:p-4"
        >
          <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-2 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <h1 className="truncate text-base font-black text-rose-600 sm:text-lg">🚽 Gratis Plassen</h1>
                <Legend />
                <CoffeeMenu />
              </div>
              <button
                onClick={openAddForm}
                className="shrink-0 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 sm:text-sm"
              >
                ➕ Toilet toevoegen
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Legend variant="text" />
                <button
                  onClick={useMyLocation}
                  className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 sm:text-sm"
                >
                  📍 Gebruik mijn locatie
                </button>
                <form onSubmit={submitManual} className="relative flex flex-1 min-w-[180px] gap-2">
                  <input
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="of typ een adres/plaats"
                    autoComplete="off"
                    className="w-full min-w-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs sm:text-sm"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-full border border-rose-300 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 sm:text-sm"
                  >
                    Zoek
                  </button>
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute left-0 right-14 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      {suggestions.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectSuggestion(s)}
                            className="w-full truncate px-3 py-1.5 text-left text-xs hover:bg-rose-50 sm:text-sm"
                          >
                            {s.weergavenaam}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
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
      )}

      {/* Desktop floating list panel — hidden while placing a new pin so the
          map underneath is fully clickable/draggable. */}
      {!showAddForm && (
        <div
          className="absolute bottom-4 left-4 z-10 hidden w-[360px] flex-col overflow-hidden rounded-2xl bg-white shadow-lg lg:flex"
          style={{ top: topBarHeight ? topBarHeight + 16 : "6rem" }}
        >
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
      )}

      {/* Mobile bottom sheet — hidden while placing a new pin, same reason. */}
      {!showAddForm && <BottomSheet
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
      </BottomSheet>}

      {selectedLocation && (
        <div className="fixed inset-0 z-40 flex items-end justify-end bg-black/30 lg:items-stretch" onClick={() => setSelectedLocation(null)}>
          <LocationDetail
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            onReviewSubmitted={() => loadLocations(userPos?.lat, userPos?.lon)}
            onContainerClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showAddForm && (
        // No click-blocking backdrop here (unlike the detail panel above) —
        // the map underneath must stay interactive so the pin can be
        // dragged/tapped into place while the form is open.
        <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-end lg:items-stretch">
          <div className="pointer-events-auto">
            <AddLocationForm
              onClose={closeAddForm}
              onAdded={() => {
                loadLocations(userPos?.lat, userPos?.lon);
                setPinPos(null);
              }}
              onContainerClick={(e) => e.stopPropagation()}
              pinPos={pinPos}
              onPinPosChange={setPinPos}
            />
          </div>
        </div>
      )}
    </main>
  );
}
