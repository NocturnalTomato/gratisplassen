"use client";

import { useEffect, useState } from "react";
import ReviewForm from "./ReviewForm";
import { StarsDisplay } from "./Stars";
import type { LocationWithStats, Review } from "@/lib/types";

function formatDistance(m: number | null): string {
  if (m === null) return "";
  if (m < 1000) return `${m} m lopen`;
  return `${(m / 1000).toFixed(1)} km`;
}

const FACILITY_LABELS: [key: keyof LocationWithStats["stats"], label: string][] = [
  ["toiletPaperPct", "WC-papier"],
  ["washHandsPct", "Handen wassen"],
  ["padsTamponsPct", "Maandverband/tampons"],
  ["showerPct", "Douche"],
];

export default function LocationDetail({
  location,
  onClose,
  onReviewSubmitted,
}: {
  location: LocationWithStats;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadReviews() {
    setLoading(true);
    const res = await fetch(`/api/locations/${location.id}/reviews`);
    const data = await res.json();
    setReviews(data.reviews ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id]);

  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lon}`;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="mx-auto -mt-1 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-gray-300 lg:hidden" />
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{location.name}</h2>
          <p className="text-sm text-gray-500">{location.address}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Sluiten">
          ✕
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StarsDisplay value={location.stats.avgStars} />
        <span className="text-sm text-gray-500">({location.stats.count} reviews)</span>
        {location.distanceMeters !== null && (
          <span className="text-sm text-rose-600">{formatDistance(location.distanceMeters)}</span>
        )}
      </div>

      <a
        href={navUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
      >
        🧭 Navigeer hierheen
      </a>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {FACILITY_LABELS.map(([key, label]) => {
          const pct = location.stats[key] as number | null;
          return (
            <div key={String(key)} className="rounded-lg bg-gray-50 px-3 py-2">
              {label}: {pct === null ? "?" : `${pct}%`}
            </div>
          );
        })}
      </div>

      {location.type === "mcdonalds" && (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          Bij ketens zoals McDonald&apos;s wisselt het per vestiging of het toilet gratis
          toegankelijk is. Check de reviews hieronder.
        </p>
      )}

      <ReviewForm
        locationId={location.id}
        onSubmitted={() => {
          loadReviews();
          onReviewSubmitted?.();
        }}
      />

      <div>
        <h3 className="mb-2 font-semibold">Reviews</h3>
        {loading && <p className="text-sm text-gray-400">Laden…</p>}
        {!loading && reviews.length === 0 && (
          <p className="text-sm text-gray-400">Nog geen reviews. Wees de eerste!</p>
        )}
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-100 p-3 text-sm">
              <div className="flex items-center justify-between">
                <StarsDisplay value={r.stars} />
                <span className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString("nl-NL")}
                </span>
              </div>
              {r.comment && <p className="mt-1">{r.comment}</p>}
              <div className="mt-1 flex flex-wrap gap-1 text-xs text-gray-500">
                {r.toiletPaper && <span className="rounded-full bg-gray-100 px-2 py-0.5">WC-papier</span>}
                {r.washHands && <span className="rounded-full bg-gray-100 px-2 py-0.5">Handen wassen</span>}
                {r.padsTampons && <span className="rounded-full bg-gray-100 px-2 py-0.5">Maandverband</span>}
                {r.shower && <span className="rounded-full bg-gray-100 px-2 py-0.5">Douche</span>}
                {r.paid !== null && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">
                    {r.paid ? "Betaald" : "Gratis"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
