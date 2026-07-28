import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureSchema } from "@/lib/db";
import { getRequestIpHash } from "@/lib/ipHash";
import { checkRateLimit } from "@/lib/rateLimit";
import { getReviewsForLocation } from "@/lib/reviewStats";
import { getLocationById } from "@/lib/locations";

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
  const location = await getLocationById(params.id);
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

  const reportType: "review" | "no_toilet" | "urinal_only" =
    body.reportType === "no_toilet" || body.reportType === "urinal_only"
      ? body.reportType
      : "review";
  const noToilet = reportType === "no_toilet";
  const urinalOnly = reportType === "urinal_only";

  // Bij een "geen toilet"/"alleen urinoir"-melding is er niets te
  // beoordelen — sterren, schoonheid en voorzieningen slaan dan nergens op.
  let stars: number | null = null;
  let cleanRating: number | null = null;
  let toiletPaper = false;
  let washHands = false;
  let padsTampons = false;
  let shower = false;
  let paid: boolean | null = null;

  if (reportType === "review") {
    stars = Number(body.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ error: "Ongeldige sterrenscore." }, { status: 400 });
    }

    cleanRating =
      body.cleanRating === null || body.cleanRating === undefined
        ? null
        : Number(body.cleanRating);
    if (cleanRating !== null && (!Number.isInteger(cleanRating) || cleanRating < 1 || cleanRating > 5)) {
      return NextResponse.json({ error: "Ongeldige schoonheidsscore." }, { status: 400 });
    }

    toiletPaper = body.toiletPaper === true;
    washHands = body.washHands === true;
    padsTampons = body.padsTampons === true;
    shower = body.shower === true;
    paid = body.paid === true ? true : body.paid === false ? false : null;
  }

  let comment: string | null =
    typeof body.comment === "string" ? body.comment.trim() : null;
  if (comment && comment.length > MAX_COMMENT_LENGTH) {
    comment = comment.slice(0, MAX_COMMENT_LENGTH);
  }
  if (comment === "") comment = null;

  const ipHash = getRequestIpHash();

  const rl = await checkRateLimit(ipHash, location.id, comment);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.reason }, { status: 429 });
  }

  await ensureSchema();
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO reviews
      (location_id, stars, clean_rating, toilet_paper, wash_hands, pads_tampons, shower, paid, no_toilet, urinal_only, comment, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      location.id,
      stars,
      cleanRating,
      toiletPaper ? 1 : 0,
      washHands ? 1 : 0,
      padsTampons ? 1 : 0,
      shower ? 1 : 0,
      paid === null ? null : paid ? 1 : 0,
      noToilet ? 1 : 0,
      urinalOnly ? 1 : 0,
      comment,
      ipHash,
    ],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
