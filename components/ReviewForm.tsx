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
  const [reportType, setReportType] = useState<"review" | "no_toilet" | "urinal_only">("review");
  const [stars, setStars] = useState(0);
  const [toiletPaper, setToiletPaper] = useState(false);
  const [washHands, setWashHands] = useState(false);
  const [padsTampons, setPadsTampons] = useState(false);
  const [shower, setShower] = useState(false);
  const [paid, setPaid] = useState<"" | "yes" | "no">("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState("");
  const [rateLimitMessage, setRateLimitMessage] = useState("");
  const formOpenedAt = useRef(Date.now());
  // Honeypot: dit veld staat verborgen in de UI, bots vullen het vaak toch in.
  const website = useRef("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reportType === "review" && stars === 0) {
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
          reportType,
          stars,
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
        if (res.status === 429) {
          setRateLimitMessage(
            data.error ||
              "Je hebt te veel reviews achtergelaten. Om misbruik te beperken mag je maar een beperkt aantal reviews per uur plaatsen. Probeer het later opnieuw."
          );
        } else {
          setError(data.error || "Er ging iets mis.");
        }
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
      <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
        Bedankt voor je review!
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="font-semibold dark:text-zinc-100">Laat een review achter</h3>

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
        <label className="mb-1 block text-sm font-medium dark:text-zinc-200">Wat wil je melden?</label>
        <div className="flex flex-col gap-1 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" name="reportType" checked={reportType === "review"} onChange={() => setReportType("review")} />
            Een review met score
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="reportType" checked={reportType === "no_toilet"} onChange={() => setReportType("no_toilet")} />
            Geen toilet aanwezig
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="reportType" checked={reportType === "urinal_only"} onChange={() => setReportType("urinal_only")} />
            Alleen een urinoir
          </label>
        </div>
      </div>

      {reportType === "review" && (
        <>
          <StarsInput value={stars} onChange={setStars} label="Hoe schoon was het?" />

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
            <label className="mb-1 block text-sm font-medium dark:text-zinc-200">Was het gratis?</label>
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
        </>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium dark:text-zinc-200">Reactie (optioneel)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder='Bijv. "was heel vies" of "kon er ook douchen en mijn handen wassen"'
          className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
      >
        {status === "loading" ? "Versturen…" : "Review plaatsen"}
      </button>

      {rateLimitMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setRateLimitMessage("")}
        >
          <div
            className="max-w-sm rounded-xl bg-white p-5 shadow-lg dark:bg-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="mb-2 font-semibold dark:text-zinc-100">Even geduld</h4>
            <p className="text-sm text-gray-600 dark:text-zinc-300">{rateLimitMessage}</p>
            <button
              type="button"
              onClick={() => setRateLimitMessage("")}
              className="mt-4 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Oké
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
