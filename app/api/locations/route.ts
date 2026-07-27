import { NextRequest, NextResponse } from "next/server";
import locations from "@/data/locations.json";
import { distanceMeters } from "@/lib/geo";
import { getStatsForLocations } from "@/lib/reviewStats";
import type { Location, LocationWithStats } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const userLat = lat ? parseFloat(lat) : null;
  const userLon = lon ? parseFloat(lon) : null;

  const all = locations as Location[];
  const stats = await getStatsForLocations(all.map((l) => l.id));

  const withStats: LocationWithStats[] = all.map((l) => ({
    ...l,
    distanceMeters:
      userLat !== null && userLon !== null
        ? Math.round(distanceMeters(userLat, userLon, l.lat, l.lon))
        : null,
    stats: stats.get(l.id)!,
  }));

  withStats.sort((a, b) => {
    if (a.distanceMeters === null || b.distanceMeters === null) return 0;
    return a.distanceMeters - b.distanceMeters;
  });

  return NextResponse.json({ locations: withStats });
}
