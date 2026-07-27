import { NextRequest, NextResponse } from "next/server";
import { lookupAddress } from "@/lib/pdok";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Geef een adres-id op." }, { status: 400 });
  }
  const result = await lookupAddress(id);
  if (!result) {
    return NextResponse.json({ error: "Adres niet gevonden." }, { status: 404 });
  }
  return NextResponse.json(result);
}
