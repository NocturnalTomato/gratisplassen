import { createClient, type Client } from "@libsql/client";

/**
 * Zonder TURSO_DATABASE_URL draait dit tegen een lokaal SQLite-bestand
 * (data/local.db) — handig voor development, geen externe dienst nodig.
 * Zet TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in productie (bv. Turso, gratis
 * tier, geen Cloudflare) voor een db die persistent is op Vercel's
 * serverless functions.
 */
let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  client = url
    ? createClient({ url, authToken })
    : createClient({ url: "file:./data/local.db" });

  return client;
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          location_id TEXT NOT NULL,
          stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
          clean_rating INTEGER CHECK (clean_rating BETWEEN 1 AND 5),
          toilet_paper INTEGER NOT NULL DEFAULT 0,
          wash_hands INTEGER NOT NULL DEFAULT 0,
          pads_tampons INTEGER NOT NULL DEFAULT 0,
          shower INTEGER NOT NULL DEFAULT 0,
          paid INTEGER,
          comment TEXT,
          ip_hash TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await db.execute(
        `CREATE INDEX IF NOT EXISTS idx_reviews_location ON reviews(location_id)`
      );
      await db.execute(
        `CREATE INDEX IF NOT EXISTS idx_reviews_ip_time ON reviews(ip_hash, created_at)`
      );
    })();
  }
  return schemaReady;
}
