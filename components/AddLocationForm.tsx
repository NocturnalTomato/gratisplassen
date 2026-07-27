"use client";

import { useRef, useState } from "react";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "openbaar", label: "Openbaar toilet" },
  { value: "station", label: "NS-station" },
  { value: "warenhuis", label: "Warenhuis" },
  { value: "horeca", label: "Horeca (café/restaurant)" },
  { value: "mcdonalds", label: "McDonald's" },
  { value: "anders", label: "Anders" },
];

export default function AddLocationForm({
  onClose,
  onAdded,
  onContainerClick,
}: {
  onClose: () => void;
  onAdded: () => void;
  onContainerClick?: (e: React.MouseEvent) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("openbaar");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
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
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setLocStatus("done");
      },
      () => {
        setLocStatus("error");
        setError("Kon je locatie niet ophalen. Typ hieronder een adres.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function geocodeFromAddress(): Promise<{ lat: number; lon: number } | null> {
    if (!address.trim()) return null;
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return { lat: data.lat, lon: data.lon };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Geef een naam op.");
      return;
    }

    let coords = lat !== null && lon !== null ? { lat, lon } : null;
    if (!coords) {
      setStatus("loading");
      coords = await geocodeFromAddress();
      if (!coords) {
        setError("Kon geen locatie bepalen. Gebruik de locatieknop of typ een preciezer adres.");
        setStatus("error");
        return;
      }
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
          lat: coords.lat,
          lon: coords.lon,
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
        className="flex h-full max-h-[90vh] w-full flex-col items-center justify-center gap-3 rounded-t-3xl bg-white p-4 text-center shadow-xl lg:h-full lg:max-h-none lg:max-w-md lg:rounded-none"
        onClick={onContainerClick}
      >
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
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
      className="flex h-full max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl lg:h-full lg:max-h-none lg:max-w-md lg:rounded-none"
    >
      <div className="flex items-start justify-between">
        <h2 className="text-xl font-bold">Toilet toevoegen</h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Sluiten">
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
        <label className="mb-1 block text-sm font-medium">Naam</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder='Bijv. "Openbaar toilet Museumplein"'
          className="w-full rounded-lg border border-gray-300 p-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-2 text-sm"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Adres (optioneel)</label>
        <input
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setLat(null);
            setLon(null);
            setLocStatus("idle");
          }}
          maxLength={200}
          placeholder="Straat, plaats"
          className="w-full rounded-lg border border-gray-300 p-2 text-sm"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={useMyLocation}
          className="rounded-full border border-rose-300 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
        >
          📍 Gebruik mijn huidige locatie
        </button>
        {locStatus === "loading" && <p className="mt-1 text-xs text-gray-400">Locatie ophalen…</p>}
        {locStatus === "done" && lat !== null && lon !== null && (
          <p className="mt-1 text-xs text-green-700">
            Locatie ingesteld ({lat.toFixed(5)}, {lon.toFixed(5)})
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Is het gratis?</label>
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
          <label className="mb-1 block text-sm font-medium">Prijsindicatie (optioneel)</label>
          <input
            value={priceHint}
            onChange={(e) => setPriceHint(e.target.value)}
            maxLength={40}
            placeholder="Bijv. ~€0,50"
            className="w-full rounded-lg border border-gray-300 p-2 text-sm"
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={wheelchair} onChange={(e) => setWheelchair(e.target.checked)} />
        Rolstoeltoegankelijk
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
      >
        {status === "loading" ? "Toevoegen…" : "Toilet toevoegen"}
      </button>
      <p className="text-xs text-gray-400">
        Geen account nodig. Max. 5 locaties per uur en 15 per dag per IP-adres, om misbruik te
        beperken.
      </p>
    </form>
  );
}
