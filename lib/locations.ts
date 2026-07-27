import staticLocations from "@/data/locations.json";
import { getDb, ensureSchema } from "./db";
import type { Location } from "./types";

/**
 * Locaties komen uit twee bronnen: de statische data/locations.json (eigen
 * selectie + OSM-import) en door gebruikers toegevoegde locaties in de
 * database. Deze module combineert ze zodat de rest van de app niet hoeft te
 * weten waar een locatie vandaan komt.
 */
export async function getAllLocations(): Promise<Location[]> {
  await ensureSchema();
  const db = getDb();
  const res = await db.execute(
    `SELECT id, name, type, address, lat, lon, paid, price_hint, wheelchair, source
     FROM locations ORDER BY created_at DESC`
  );
  const userLocations: Location[] = res.rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    type: String(r.type),
    address: r.address === null ? null : String(r.address),
    lat: Number(r.lat),
    lon: Number(r.lon),
    paid: r.paid === null ? null : Number(r.paid) === 1,
    priceHint: r.price_hint === null ? null : String(r.price_hint),
    wheelchair: Number(r.wheelchair) === 1,
    source: String(r.source),
  }));
  return [...(staticLocations as Location[]), ...userLocations];
}

export async function getLocationById(id: string): Promise<Location | null> {
  const staticMatch = (staticLocations as Location[]).find((l) => l.id === id);
  if (staticMatch) return staticMatch;

  await ensureSchema();
  const db = getDb();
  const res = await db.execute({
    sql: `SELECT id, name, type, address, lat, lon, paid, price_hint, wheelchair, source
          FROM locations WHERE id = ?`,
    args: [id],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    address: row.address === null ? null : String(row.address),
    lat: Number(row.lat),
    lon: Number(row.lon),
    paid: row.paid === null ? null : Number(row.paid) === 1,
    priceHint: row.price_hint === null ? null : String(row.price_hint),
    wheelchair: Number(row.wheelchair) === 1,
    source: String(row.source),
  };
}
