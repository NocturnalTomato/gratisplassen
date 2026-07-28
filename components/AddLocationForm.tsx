"use client";

import { useEffect, useRef, useState } from "react";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "openbaar", label: "Openbaar toilet" },
  { value: "warenhuis", label: "Winkel" },
  { value: "horeca", label: "Horeca" },
  { value: "anders", label: "Anders" },
];

type AddressSuggestion = { id: string; weergavenaam: string };

export default function AddLocationForm({
  onClose,
  onAdded,
  onContainerClick,
  pinPos,
  onPinPosChange,
}: {
  onClose: () => void;
  onAdded: () => void;
  onContainerClick?: (e: React.MouseEvent) => void;
  pinPos: { lat: number; lon: number } | null;
  onPinPosChange: (pos: { lat: number; lon: number }) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("openbaar");
  const [address, setAddress] = useState("");
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const skipNextSuggestFetch = useRef(false);
  const [paid, setPaid] = useState<"" | "yes" | "no">("");
  const [priceHint, setPriceHint] = useState("");
  const [wheelchair, setWheelchair] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState("");
  const formOpenedAt = useRef(Date.now());
  const website = useRef("");

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Je browser ondersteunt geen locatiebepaling.");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPinPosChange({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocStatus("done");
      },
      () => {
        setLocStatus("error");
        setError("Kon je locatie niet ophalen. Typ hieronder een adres of sleep de pin op de kaart.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function selectSuggestion(suggestion: AddressSuggestion) {
    skipNextSuggestFetch.current = true;
    setAddress(suggestion.weergavenaam);
    setShowSuggestions(false);
    setSuggestions([]);
    setLocStatus("loading");
    try {
      const res = await fetch(`/api/geocode/lookup?id=${encodeURIComponent(suggestion.id)}`);
      if (!res.ok) throw new Error("niet gevonden");
      const geo = await res.json();
      onPinPosChange({ lat: geo.lat, lon: geo.lon });
      setLocStatus("done");
    } catch {
      setLocStatus("error");
      setError("Kon dit adres niet vinden. Probeer een preciezer adres of sleep de pin.");
    }
  }

  useEffect(() => {
    if (skipNextSuggestFetch.current) {
      skipNextSuggestFetch.current = false;
      return;
    }
    const query = address.trim();
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
  }, [address]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Geef een naam op.");
      return;
    }
    if (!pinPos) {
      setError("Kies een locatie: sleep de pin op de kaart, gebruik je locatie of een adres.");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          address: address || null,
          lat: pinPos.lat,
          lon: pinPos.lon,
          paid: paid === "" ? null : paid === "yes",
          priceHint: priceHint || null,
          wheelchair,
          formOpenedAt: formOpenedAt.current,
          website: website.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Er ging iets mis.");
        setStatus("error");
        return;
      }
      setStatus("done");
      onAdded();
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div
        className="flex h-full max-h-[90vh] w-full flex-col items-center justify-center gap-3 rounded-t-3xl bg-white p-4 text-center shadow-xl dark:bg-zinc-900 lg:h-full lg:max-h-none lg:max-w-md lg:rounded-none"
        onClick={onContainerClick}
      >
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Bedankt! Het toilet is toegevoegd.
        </p>
        <button
          onClick={onClose}
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Sluiten
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      onClick={onContainerClick}
      className="flex h-full max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl dark:bg-zinc-900 lg:h-full lg:max-h-none lg:max-w-md lg:rounded-none"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-black text-rose-600 dark:text-rose-400">🚽 Gratis Plassen</p>
          <h2 className="text-xl font-bold dark:text-zinc-100">Toilet toevoegen</h2>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200" aria-label="Sluiten">
          ✕
        </button>
      </div>

      {/* Honeypot — onzichtbaar voor mensen */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        onChange={(e) => (website.current = e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        aria-hidden="true"
      />

      <div>
        <label className="mb-1 block text-sm font-medium dark:text-zinc-200">Naam</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder='Bijv. "Openbaar toilet Museumplein"'
          className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium dark:text-zinc-200">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-950/40">
        <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-200">📍 Locatie</p>
        <p className="mb-2 text-xs text-blue-800 dark:text-blue-300">
          Sleep de blauwe pin op de kaart naar de juiste plek, of gebruik je locatie / een adres
          hieronder.
        </p>

        <div className="relative">
          <label className="mb-1 block text-sm font-medium dark:text-zinc-200">Adres (optioneel)</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            maxLength={200}
            autoComplete="off"
            placeholder="Straat, plaats"
            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(s)}
                    className="w-full truncate px-3 py-1.5 text-left text-xs hover:bg-rose-50 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:text-sm"
                  >
                    {s.weergavenaam}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-2">
          <button
            type="button"
            onClick={useMyLocation}
            className="rounded-full border border-rose-300 bg-white px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:bg-zinc-800 dark:text-rose-300 dark:hover:bg-zinc-700"
          >
            📍 Gebruik mijn huidige locatie
          </button>
          {locStatus === "loading" && <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">Locatie ophalen…</p>}
          {pinPos && (
            <p className="mt-1 text-xs text-green-700 dark:text-green-400">
              Pin staat op ({pinPos.lat.toFixed(5)}, {pinPos.lon.toFixed(5)})
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium dark:text-zinc-200">Is het gratis?</label>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" name="add-paid" checked={paid === "no"} onChange={() => setPaid("no")} />
            Gratis
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="add-paid" checked={paid === "yes"} onChange={() => setPaid("yes")} />
            Betaald
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="add-paid" checked={paid === ""} onChange={() => setPaid("")} />
            Weet ik niet
          </label>
        </div>
      </div>

      {paid === "yes" && (
        <div>
          <label className="mb-1 block text-sm font-medium dark:text-zinc-200">Prijsindicatie (optioneel)</label>
          <input
            value={priceHint}
            onChange={(e) => setPriceHint(e.target.value)}
            maxLength={40}
            placeholder="Bijv. ~€0,50"
            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={wheelchair} onChange={(e) => setWheelchair(e.target.checked)} />
        Rolstoeltoegankelijk
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
      >
        {status === "loading" ? "Toevoegen…" : "Toilet toevoegen"}
      </button>
      <p className="text-xs text-gray-400 dark:text-zinc-500">
        Geen account nodig. Max. 5 locaties per uur en 15 per dag per IP-adres, om misbruik te
        beperken.
      </p>
    </form>
  );
}
