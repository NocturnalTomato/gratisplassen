import { getDb, ensureSchema } from "./db";
import type { ReviewStats, Review } from "./types";

export async function getStatsForLocations(
  locationIds: string[]
): Promise<Map<string, ReviewStats>> {
  await ensureSchema();
  const db = getDb();
  const map = new Map<string, ReviewStats>();
  if (locationIds.length === 0) return map;

  const placeholders = locationIds.map(() => "?").join(",");
  const res = await db.execute({
    sql: `SELECT location_id, stars, toilet_paper, wash_hands, pads_tampons, shower, paid
          FROM reviews WHERE location_id IN (${placeholders})`,
    args: locationIds,
  });

  const grouped = new Map<string, typeof res.rows>();
  for (const row of res.rows) {
    const id = String(row.location_id);
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id)!.push(row);
  }

  for (const id of locationIds) {
    const rows = grouped.get(id) ?? [];
    if (rows.length === 0) {
      map.set(id, {
        count: 0,
        avgStars: null,
        toiletPaperPct: null,
        washHandsPct: null,
        padsTamponsPct: null,
        showerPct: null,
        paidVotes: { paid: 0, free: 0 },
      });
      continue;
    }
    const count = rows.length;
    const avgStars = rows.reduce((s, r) => s + Number(r.stars), 0) / count;
    const pct = (key: string) =>
      Math.round((rows.filter((r) => Number(r[key]) === 1).length / count) * 100);
    const paidVotes = {
      paid: rows.filter((r) => Number(r.paid) === 1).length,
      free: rows.filter((r) => Number(r.paid) === 0).length,
    };
    map.set(id, {
      count,
      avgStars: Math.round(avgStars * 10) / 10,
      toiletPaperPct: pct("toilet_paper"),
      washHandsPct: pct("wash_hands"),
      padsTamponsPct: pct("pads_tampons"),
      showerPct: pct("shower"),
      paidVotes,
    });
  }

  return map;
}

export async function getReviewsForLocation(locationId: string): Promise<Review[]> {
  await ensureSchema();
  const db = getDb();
  const res = await db.execute({
    sql: `SELECT id, location_id, stars, clean_rating, toilet_paper, wash_hands,
                 pads_tampons, shower, paid, comment, created_at
          FROM reviews WHERE location_id = ? ORDER BY created_at DESC LIMIT 100`,
    args: [locationId],
  });
  return res.rows.map((r) => ({
    id: Number(r.id),
    locationId: String(r.location_id),
    stars: Number(r.stars),
    cleanRating: r.clean_rating === null ? null : Number(r.clean_rating),
    toiletPaper: Number(r.toilet_paper) === 1,
    washHands: Number(r.wash_hands) === 1,
    padsTampons: Number(r.pads_tampons) === 1,
    shower: Number(r.shower) === 1,
    paid: r.paid === null ? null : Number(r.paid) === 1,
    comment: r.comment === null ? null : String(r.comment),
    createdAt: String(r.created_at),
  }));
}
