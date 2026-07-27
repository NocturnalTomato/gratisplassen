import { NextRequest, NextResponse } from "next/server";
import locations from "@/data/locations.json";
import { getDb, ensureSchema } from "@/lib/db";
import { getRequestIpHash } from "@/lib/ipHash";
import { checkRateLimit } from "@/lib/rateLimit";
import { getReviewsForLocation } from "@/lib/reviewStats";
import type { Location } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const reviews = await getReviewsForLocation(params.id);
  return NextResponse.json({ reviews });
}

const MAX_COMMENT_LENGTH = 500;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const location = (locations as Location[]).find((l) => l.id === params.id);
  if (!location) {
    return NextResponse.json({ error: "Locatie niet gevonden." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  // Honeypot-veld: onzichtbaar voor mensen, bots vullen het vaak toch in.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  // Formulier moet minstens 2.5s open hebben gestaan voor submit — een bot
  // die het formulier direct afvuurt wordt hiermee afgevangen.
  const openedAt = Number(body.formOpenedAt);
  if (!openedAt || Date.now() - openedAt < 2500) {
    return NextResponse.json(
      { error: "Probeer het nogmaals." },
      { status: 400 }
    );
  }

  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Ongeldige sterrenscore." }, { status: 400 });
  }

  const cleanRating =
    body.cleanRating === null || body.cleanRating === undefined
      ? null
      : Number(body.cleanRating);
  if (cleanRating !== null && (!Number.isInteger(cleanRating) || cleanRating < 1 || cleanRating > 5)) {
    return NextResponse.json({ error: "Ongeldige schoonheidsscore." }, { status: 400 });
  }

  let comment: string | null =
    typeof body.comment === "string" ? body.comment.trim() : null;
  if (comment && comment.length > MAX_COMMENT_LENGTH) {
    comment = comment.slice(0, MAX_COMMENT_LENGTH);
  }
  if (comment === "") comment = null;

  const paid: boolean | null =
    body.paid === true ? true : body.paid === false ? false : null;

  const ipHash = getRequestIpHash();

  const rl = await checkRateLimit(ipHash, location.id, comment);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.reason }, { status: 429 });
  }

  await ensureSchema();
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO reviews
      (location_id, stars, clean_rating, toilet_paper, wash_hands, pads_tampons, shower, paid, comment, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      location.id,
      stars,
      cleanRating,
      body.toiletPaper ? 1 : 0,
      body.washHands ? 1 : 0,
      body.padsTampons ? 1 : 0,
      body.shower ? 1 : 0,
      paid === null ? null : paid ? 1 : 0,
      comment,
      ipHash,
    ],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
