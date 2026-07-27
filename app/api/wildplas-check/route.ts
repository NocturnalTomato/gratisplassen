import { NextRequest, NextResponse } from "next/server";
import { checkBebouwdeKom, heuristiekOpAfstand } from "@/lib/bebouwdeKom";
import { reverseGeocode } from "@/lib/pdok";

/**
 * Fallback-endpoint: als er geen (dames)toilet in de buurt is, geven we
 * informatief aan of wildplassen op deze plek waarschijnlijk wel/niet mag
 * (buiten de bebouwde kom = meestal toegestaan). Geen juridisch advies.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lon = parseFloat(searchParams.get("lon") || "");

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "lat/lon vereist." }, { status: 400 });
  }

  let result = await checkBebouwdeKom(lat, lon);

  if (result.binnenBebouwdeKom === null) {
    const { afstandMeter } = await reverseGeocode(lat, lon);
    result = heuristiekOpAfstand(afstandMeter);
  }

  const magHet = result.binnenBebouwdeKom === false;

  return NextResponse.json({
    magWaarschijnlijk: magHet,
    zekerheid: result.bron === "top10nl-wfs" ? "middel" : "laag",
    bron: result.bron,
    uitleg: magHet
      ? "Je lijkt buiten de bebouwde kom te zijn — in de meeste gemeentes is wildplassen daar toegestaan. Doe het wel uit het zicht."
      : "Je lijkt binnen de bebouwde kom te zijn — daar verbiedt vrijwel elke gemeente wildplassen in de APV.",
  });
}
