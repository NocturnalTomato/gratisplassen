import { StarsDisplay } from "./Stars";
import type { LocationWithStats } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  station: "NS-station",
  warenhuis: "Winkel",
  openbaar: "Openbaar toilet",
  mcdonalds: "McDonald's",
  horeca: "Horeca",
  osm: "OpenStreetMap",
};

function formatDistance(m: number | null): string {
  if (m === null) return "";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export default function LocationCard({
  location,
  selected,
  onClick,
}: {
  location: LocationWithStats;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected
          ? "border-rose-500 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/40"
          : "border-gray-200 bg-white hover:border-rose-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-rose-700"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold dark:text-zinc-100">{location.name}</div>
          <div className="text-xs text-gray-500 dark:text-zinc-400">
            {TYPE_LABELS[location.type] ?? location.type}
            {location.address ? ` · ${location.address}` : ""}
          </div>
        </div>
        {location.distanceMeters !== null && (
          <div className="shrink-0 text-sm font-medium text-rose-600 dark:text-rose-400">
            {formatDistance(location.distanceMeters)}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <StarsDisplay value={location.stats.avgStars} />
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            location.paid === false
              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
              : location.paid === true
              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
              : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {location.paid === false
            ? "Gratis"
            : location.paid === true
            ? location.priceHint || "Betaald"
            : "Wisselt"}
        </span>
      </div>
    </button>
  );
}
