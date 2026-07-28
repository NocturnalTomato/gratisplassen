import { getDb, ensureSchema } from "./db";
import type { ReviewStats, Review } from "./types";

// Vanaf dit aantal meldingen (reviews + "geen toilet"/"alleen urinoir"-reports
// samen) telt de meldingsratio mee — voorkomt dat één enkele negatieve
// melding een locatie meteen verbergt.
const MIN_REPORTS_FOR_HIDING = 10;
// Als 70%+ van die meldingen "geen toilet" of "alleen urinoir" is, verbergen
// we de locatie uit lijst en kaart.
const BAD_REPORT_RATIO_THRESHOLD = 0.7;

export async function getStatsForLocations(
  locationIds: string[]
): Promise<Map<string, ReviewStats>> {
  await ensureSchema();
  const db = getDb();
  const map = new Map<string, ReviewStats>();
  if (locationIds.length === 0) return map;

  const placeholders = locationIds.map(() => "?").join(",");
  const res = await db.execute({
    sql: `SELECT location_id, stars, toilet_paper, wash_hands, pads_tampons, shower, paid, no_toilet, urinal_only
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
    const noToiletCount = rows.filter((r) => Number(r.no_toilet) === 1).length;
    const urinalOnlyCount = rows.filter((r) => Number(r.urinal_only) === 1).length;
    const reportCount = noToiletCount + urinalOnlyCount;
    // "Geen toilet" verbergt de locatie helemaal. "Alleen urinoir" niet — dat
    // is enkel filterbaar via de "filter urinoirs"-optie in de zoekbalk.
    const hidden =
      rows.length >= MIN_REPORTS_FOR_HIDING &&
      noToiletCount / rows.length >= BAD_REPORT_RATIO_THRESHOLD;
    const isUrinalOnly =
      rows.length >= MIN_REPORTS_FOR_HIDING &&
      urinalOnlyCount / rows.length >= BAD_REPORT_RATIO_THRESHOLD;

    // Sterren/voorzieningen worden alleen ingevuld bij een normale review,
    // niet bij een "geen toilet"/"alleen urinoir"-melding.
    const starRows = rows.filter((r) => r.stars !== null);
    if (starRows.length === 0) {
      map.set(id, {
        count: 0,
        avgStars: null,
        toiletPaperPct: null,
        washHandsPct: null,
        padsTamponsPct: null,
        showerPct: null,
        paidVotes: { paid: 0, free: 0 },
        noToiletCount,
        urinalOnlyCount,
        reportCount,
        hidden,
        isUrinalOnly,
      });
      continue;
    }
    const count = starRows.length;
    const avgStars = starRows.reduce((s, r) => s + Number(r.stars), 0) / count;
    const pct = (key: string) =>
      Math.round((starRows.filter((r) => Number(r[key]) === 1).length / count) * 100);
    const paidVotes = {
      paid: starRows.filter((r) => Number(r.paid) === 1).length,
      free: starRows.filter((r) => Number(r.paid) === 0).length,
    };
    map.set(id, {
      count,
      avgStars: Math.round(avgStars * 10) / 10,
      toiletPaperPct: pct("toilet_paper"),
      washHandsPct: pct("wash_hands"),
      padsTamponsPct: pct("pads_tampons"),
      showerPct: pct("shower"),
      paidVotes,
      noToiletCount,
      urinalOnlyCount,
      reportCount,
      hidden,
      isUrinalOnly,
    });
  }

  return map;
}

export async function getReviewsForLocation(locationId: string): Promise<Review[]> {
  await ensureSchema();
  const db = getDb();
  const res = await db.execute({
    sql: `SELECT id, location_id, stars, clean_rating, toilet_paper, wash_hands,
                 pads_tampons, shower, paid, no_toilet, urinal_only, comment, created_at
          FROM reviews WHERE location_id = ? ORDER BY created_at DESC LIMIT 100`,
    args: [locationId],
  });
  return res.rows.map((r) => ({
    id: Number(r.id),
    locationId: String(r.location_id),
    stars: r.stars === null ? null : Number(r.stars),
    cleanRating: r.clean_rating === null ? null : Number(r.clean_rating),
    toiletPaper: Number(r.toilet_paper) === 1,
    washHands: Number(r.wash_hands) === 1,
    padsTampons: Number(r.pads_tampons) === 1,
    shower: Number(r.shower) === 1,
    paid: r.paid === null ? null : Number(r.paid) === 1,
    noToilet: Number(r.no_toilet) === 1,
    urinalOnly: Number(r.urinal_only) === 1,
    comment: r.comment === null ? null : String(r.comment),
    createdAt: String(r.created_at),
  }));
}
