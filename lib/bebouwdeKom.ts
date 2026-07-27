/**
 * Bepaalt of een punt binnen de "bebouwde kom" ligt — gebruikt als fallback-
 * antwoord ("mag ik hier wildplassen?") wanneer er geen toilet in de buurt is.
 *
 * Bron: BRT TOP10NL, laag "plaats", via de PDOK WFS. Zie ARCHITECTURE.md in
 * het "mag-ik-hier-wildplassen" project voor de juridische achtergrond: er is
 * geen landelijk verbod, gemeentes regelen dit via de APV en verbieden het
 * vrijwel altijd alleen binnen de bebouwde kom. Dit is dus een sterke proxy,
 * geen waterdichte juridische bron.
 *
 * Herbruikt/aangepast uit het "mag-ik-hier-wildplassen" project.
 */

const WFS_URL = "https://service.pdok.nl/brt/top10nl/wfs/v1_0";

export interface BebouwdeKomResult {
  binnenBebouwdeKom: boolean | null;
  plaatsnaam: string | null;
  bron: "top10nl-wfs" | "afstand-heuristiek" | "onbekend";
}

export async function checkBebouwdeKom(
  lat: number,
  lon: number
): Promise<BebouwdeKomResult> {
  const cql = `INTERSECTS(geometrie,POINT(${lon} ${lat}))`;
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: "top10nl:plaats",
    outputFormat: "application/json",
    srsName: "urn:ogc:def:crs:EPSG::4326",
    count: "1",
    cql_filter: cql,
  });

  try {
    const res = await fetch(`${WFS_URL}?${params.toString()}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return { binnenBebouwdeKom: null, plaatsnaam: null, bron: "onbekend" };
    }
    const data = await res.json();
    const feature = data?.features?.[0];

    if (feature) {
      return {
        binnenBebouwdeKom: true,
        plaatsnaam: feature.properties?.naamnl ?? feature.properties?.naam ?? null,
        bron: "top10nl-wfs",
      };
    }
    return { binnenBebouwdeKom: false, plaatsnaam: null, bron: "top10nl-wfs" };
  } catch {
    return { binnenBebouwdeKom: null, plaatsnaam: null, bron: "onbekend" };
  }
}

export function heuristiekOpAfstand(afstandMeter: number | null): BebouwdeKomResult {
  if (afstandMeter === null) {
    return { binnenBebouwdeKom: null, plaatsnaam: null, bron: "onbekend" };
  }
  return {
    binnenBebouwdeKom: afstandMeter < 75,
    plaatsnaam: null,
    bron: "afstand-heuristiek",
  };
}
