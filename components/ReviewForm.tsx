"use client";

import { useRef, useState } from "react";
import { StarsInput } from "./Stars";

export default function ReviewForm({
  locationId,
  onSubmitted,
}: {
  locationId: string;
  onSubmitted: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [cleanRating, setCleanRating] = useState(0);
  const [toiletPaper, setToiletPaper] = useState(false);
  const [washHands, setWashHands] = useState(false);
  const [padsTampons, setPadsTampons] = useState(false);
  const [shower, setShower] = useState(false);
  const [paid, setPaid] = useState<"" | "yes" | "no">("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState("");
  const formOpenedAt = useRef(Date.now());
  // Honeypot: dit veld staat verborgen in de UI, bots vullen het vaak toch in.
  const website = useRef("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (stars === 0) {
      setError("Kies een sterrenscore.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`/api/locations/${locationId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stars,
          cleanRating: cleanRating || null,
          toiletPaper,
          washHands,
          padsTampons,
          shower,
          paid: paid === "" ? null : paid === "yes",
          comment: comment || null,
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
      onSubmitted();
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
        Bedankt voor je review!
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="font-semibold">Laat een review achter</h3>

      {/* Honeypot — onzichtbaar voor mensen */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        onChange={(e) => (website.current = e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        aria-hidden="true"
      />

      <StarsInput value={stars} onChange={setStars} label="Algemene score" />
      <StarsInput value={cleanRating} onChange={setCleanRating} label="Hoe schoon was het?" />

      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={toiletPaper} onChange={(e) => setToiletPaper(e.target.checked)} />
          WC-papier aanwezig
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={washHands} onChange={(e) => setWashHands(e.target.checked)} />
          Handen wassen
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={padsTampons} onChange={(e) => setPadsTampons(e.target.checked)} />
          Maandverband/tampon-automaat
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={shower} onChange={(e) => setShower(e.target.checked)} />
          Douche aanwezig
        </label>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Was het gratis?</label>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" name="paid" checked={paid === "no"} onChange={() => setPaid("no")} />
            Gratis
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="paid" checked={paid === "yes"} onChange={() => setPaid("yes")} />
            Betaald
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="paid" checked={paid === ""} onChange={() => setPaid("")} />
            Weet ik niet
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Reactie (optioneel)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder='Bijv. "was heel vies" of "kon er ook douchen en mijn handen wassen"'
          className="w-full rounded-lg border border-gray-300 p-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
      >
        {status === "loading" ? "Versturen…" : "Review plaatsen"}
      </button>
      <p className="text-xs text-gray-400">
        Geen account nodig. Max. 2 reviews per locatie en 5 per uur per IP-adres, om misbruik te
        beperken.
      </p>
    </form>
  );
}
