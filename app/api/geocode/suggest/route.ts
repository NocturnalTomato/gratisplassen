import { NextRequest, NextResponse } from "next/server";
import { suggestAddresses } from "@/lib/pdok";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }
  const suggestions = await suggestAddresses(q);
  return NextResponse.json({ suggestions });
}
