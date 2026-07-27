import { getDb } from "./db";

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

const MAX_PER_LOCATION_PER_IP = 2;
const MAX_PER_HOUR_PER_IP = 5;

/**
 * Simpele, pragmatische misbruikchecks zonder account-systeem:
 * - max 2 reviews per locatie per IP (voor altijd)
 * - max 5 reviews per uur per IP (over alle locaties)
 * - "bot-achtig" gedrag: exact dezelfde comment-tekst die deze IP recent
 *   al plaatste, of een comment die te snel na het openen van het formulier
 *   binnenkomt (client stuurt formOpenedAt mee).
 */
export async function checkRateLimit(
  ipHash: string,
  locationId: string,
  comment: string | null
): Promise<RateLimitResult> {
  const db = getDb();

  const perLocation = await db.execute({
    sql: `SELECT COUNT(*) as c FROM reviews WHERE ip_hash = ? AND location_id = ?`,
    args: [ipHash, locationId],
  });
  const perLocationCount = Number(perLocation.rows[0]?.c ?? 0);
  if (perLocationCount >= MAX_PER_LOCATION_PER_IP) {
    return {
      allowed: false,
      reason: "Je hebt deze locatie al twee keer beoordeeld.",
    };
  }

  const perHour = await db.execute({
    sql: `SELECT COUNT(*) as c FROM reviews WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')`,
    args: [ipHash],
  });
  const perHourCount = Number(perHour.rows[0]?.c ?? 0);
  if (perHourCount >= MAX_PER_HOUR_PER_IP) {
    return {
      allowed: false,
      reason: "Te veel reviews in korte tijd. Probeer het over een uur opnieuw.",
    };
  }

  if (comment && comment.trim().length > 0) {
    const dup = await db.execute({
      sql: `SELECT COUNT(*) as c FROM reviews WHERE ip_hash = ? AND comment = ? AND created_at > datetime('now', '-1 day')`,
      args: [ipHash, comment.trim()],
    });
    if (Number(dup.rows[0]?.c ?? 0) > 0) {
      return {
        allowed: false,
        reason: "Deze exact dezelfde reactie is al eerder van jou geplaatst.",
      };
    }
  }

  return { allowed: true };
}

const MAX_LOCATIONS_PER_HOUR_PER_IP = 5;
const MAX_LOCATIONS_PER_DAY_PER_IP = 15;

/**
 * Zelfde soort pragmatische misbruikcheck als hierboven, maar dan voor het
 * toevoegen van nieuwe locaties.
 */
export async function checkAddLocationRateLimit(
  ipHash: string
): Promise<RateLimitResult> {
  const db = getDb();

  const perHour = await db.execute({
    sql: `SELECT COUNT(*) as c FROM locations WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')`,
    args: [ipHash],
  });
  if (Number(perHour.rows[0]?.c ?? 0) >= MAX_LOCATIONS_PER_HOUR_PER_IP) {
    return {
      allowed: false,
      reason: "Te veel locaties in korte tijd toegevoegd. Probeer het over een uur opnieuw.",
    };
  }

  const perDay = await db.execute({
    sql: `SELECT COUNT(*) as c FROM locations WHERE ip_hash = ? AND created_at > datetime('now', '-1 day')`,
    args: [ipHash],
  });
  if (Number(perDay.rows[0]?.c ?? 0) >= MAX_LOCATIONS_PER_DAY_PER_IP) {
    return {
      allowed: false,
      reason: "Je hebt vandaag al veel locaties toegevoegd. Probeer het morgen opnieuw.",
    };
  }

  return { allowed: true };
}
