import { NextRequest, NextResponse } from "next/server";
import { distanceMeters } from "@/lib/geo";
import { getStatsForLocations } from "@/lib/reviewStats";
import { getAllLocations } from "@/lib/locations";
import { getDb, ensureSchema } from "@/lib/db";
import { getRequestIpHash } from "@/lib/ipHash";
import { checkAddLocationRateLimit } from "@/lib/rateLimit";
import type { LocationWithStats } from "@/lib/types";

function parseBounds(searchParams: URLSearchParams) {
  const minLat = parseFloat(searchParams.get("minLat") ?? "");
  const maxLat = parseFloat(searchParams.get("maxLat") ?? "");
  const minLon = parseFloat(searchParams.get("minLon") ?? "");
  const maxLon = parseFloat(searchParams.get("maxLon") ?? "");
  if (![minLat, maxLat, minLon, maxLon].every(Number.isFinite)) return null;
  return { minLat, maxLat, minLon, maxLon };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const userLat = lat ? parseFloat(lat) : null;
  const userLon = lon ? parseFloat(lon) : null;
  const bounds = parseBounds(searchParams);

  const allLocations = await getAllLocations();
  // Als de kaart een viewport doorgeeft, beperken we tot die bbox — anders
  // zouden we bij elke laad/beweeg-actie het volledige landelijke bestand
  // (~4000 locaties, ~1.5MB) versturen en clusteren.
  const all = bounds
    ? allLocations.filter(
        (l) =>
          l.lat >= bounds.minLat &&
          l.lat <= bounds.maxLat &&
          l.lon >= bounds.minLon &&
          l.lon <= bounds.maxLon
      )
    : allLocations;
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

const MAX_NAME_LENGTH = 120;
const MAX_ADDRESS_LENGTH = 200;
const MAX_PRICE_HINT_LENGTH = 40;
const VALID_TYPES = new Set([
  "station",
  "warenhuis",
  "openbaar",
  "mcdonalds",
  "horeca",
  "anders",
]);

const DIACRITICS = new RegExp(
  "[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]",
  "g"
);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  // Honeypot-veld: onzichtbaar voor mensen, bots vullen het vaak toch in.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  // Formulier moet minstens 2.5s open hebben gestaan voor submit.
  const openedAt = Number(body.formOpenedAt);
  if (!openedAt || Date.now() - openedAt < 2500) {
    return NextResponse.json(
      { error: "Probeer het nogmaals." },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "Geef een geldige naam op." }, { status: 400 });
  }

  const type = typeof body.type === "string" && VALID_TYPES.has(body.type) ? body.type : "anders";

  let address: string | null = typeof body.address === "string" ? body.address.trim() : null;
  if (address && address.length > MAX_ADDRESS_LENGTH) address = address.slice(0, MAX_ADDRESS_LENGTH);
  if (address === "") address = null;

  const lat = Number(body.lat);
  const lon = Number(body.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Ongeldige locatie." }, { status: 400 });
  }

  const paid: boolean | null = body.paid === true ? true : body.paid === false ? false : null;

  let priceHint: string | null = typeof body.priceHint === "string" ? body.priceHint.trim() : null;
  if (priceHint && priceHint.length > MAX_PRICE_HINT_LENGTH) priceHint = priceHint.slice(0, MAX_PRICE_HINT_LENGTH);
  if (priceHint === "") priceHint = null;

  const wheelchair = body.wheelchair === true;

  const ipHash = getRequestIpHash();
  const rl = await checkAddLocationRateLimit(ipHash);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.reason }, { status: 429 });
  }

  await ensureSchema();
  const db = getDb();

  const base = slugify(name) || "toilet";
  let id = `user-${base}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.execute({
      sql: `SELECT 1 FROM locations WHERE id = ?`,
      args: [id],
    });
    if (existing.rows.length === 0) break;
    id = `user-${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  await db.execute({
    sql: `INSERT INTO locations
      (id, name, type, address, lat, lon, paid, price_hint, wheelchair, source, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      name,
      type,
      address,
      lat,
      lon,
      paid === null ? null : paid ? 1 : 0,
      priceHint,
      wheelchair ? 1 : 0,
      "gebruiker",
      ipHash,
    ],
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
