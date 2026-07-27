import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/pdok";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "Geef een adres of plaatsnaam op." }, { status: 400 });
  }
  const result = await geocodeAddress(q);
  if (!result) {
    return NextResponse.json({ error: "Adres niet gevonden." }, { status: 404 });
  }
  return NextResponse.json(result);
}
