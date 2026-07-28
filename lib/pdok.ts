/**
 * Helpers rond de PDOK Locatieserver (BZK) — een gratis, publieke REST API
 * voor Nederlandse adres-geocoding, zonder API key.
 * Docs: https://api.pdok.nl/bzk/locatieserver/search/v3_1/ui/
 *
 * Herbruikt/aangepast uit het "mag-ik-hier-wildplassen" project.
 */

const LOCATIESERVER_BASE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";

// De typen die een gebied (i.p.v. één punt) voorstellen — hiervoor vragen we
// de polygoon op zodat de kaart op het hele gebied kan inzoomen, niet alleen
// op het centroïde.
const AREA_TYPES = new Set(["woonplaats", "gemeente", "provincie"]);
const SEARCH_TYPES = "adres OR postcode OR woonplaats OR gemeente OR provincie";

// PDOK Locatieserver dekt alleen Nederland en kent geen "land"-type, dus
// "Nederland" (heel het land) zoeken we hardcoded af — bounds die het hele
// koninkrijk in Europa dekken (Waddeneilanden t/m Zuid-Limburg).
const NETHERLANDS_BBOX: BoundingBox = {
  minLat: 50.75,
  maxLat: 53.55,
  minLon: 3.36,
  maxLon: 7.23,
};

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface GeocodeResult {
  weergavenaam: string;
  gemeentenaam: string;
  lat: number;
  lon: number;
  bbox?: BoundingBox;
}

// Parseert alle coördinaatparen uit een WKT (MULTI)POLYGON string en geeft
// de omvattende bounding box terug — genoeg om de kaart op te fitten, zonder
// de volledige polygoon te hoeven tekenen.
function bboxFromWkt(wkt: string | undefined): BoundingBox | null {
  if (!wkt) return null;
  const pairs = wkt.matchAll(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g);
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  let found = false;
  for (const [, lonStr, latStr] of pairs) {
    const lon = parseFloat(lonStr);
    const lat = parseFloat(latStr);
    if (Number.isNaN(lon) || Number.isNaN(lat)) continue;
    found = true;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  return found ? { minLat, maxLat, minLon, maxLon } : null;
}

function isNetherlandsQuery(query: string): boolean {
  const q = query.trim().toLowerCase();
  return q === "nederland" || q === "the netherlands" || q === "holland" || q === "nl";
}

export async function geocodeAddress(
  query: string
): Promise<GeocodeResult | null> {
  if (isNetherlandsQuery(query)) {
    return {
      weergavenaam: "Nederland",
      gemeentenaam: "",
      lat: 52.1326,
      lon: 5.2913,
      bbox: NETHERLANDS_BBOX,
    };
  }

  const url = `${LOCATIESERVER_BASE}/free?q=${encodeURIComponent(
    query
  )}&rows=1&fq=type:(${SEARCH_TYPES})&fl=weergavenaam,gemeentenaam,centroide_ll,type,geometrie_ll`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data?.response?.docs?.[0];
  if (!doc?.centroide_ll) return null;

  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(doc.centroide_ll);
  if (!match) return null;

  return {
    weergavenaam: doc.weergavenaam,
    gemeentenaam: doc.gemeentenaam ?? "",
    lon: parseFloat(match[1]),
    lat: parseFloat(match[2]),
    bbox: AREA_TYPES.has(doc.type) ? bboxFromWkt(doc.geometrie_ll) ?? undefined : undefined,
  };
}

export interface AddressSuggestion {
  id: string;
  weergavenaam: string;
}

export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  const url = `${LOCATIESERVER_BASE}/suggest?q=${encodeURIComponent(
    query
  )}&rows=5&fq=type:(${SEARCH_TYPES})&fl=id,weergavenaam`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return [];
  const data = await res.json();
  const docs = data?.response?.docs ?? [];
  return docs
    .filter((doc: { id?: string; weergavenaam?: string }) => doc.id && doc.weergavenaam)
    .map((doc: { id: string; weergavenaam: string }) => ({ id: doc.id, weergavenaam: doc.weergavenaam }));
}

export async function lookupAddress(id: string): Promise<GeocodeResult | null> {
  const url = `${LOCATIESERVER_BASE}/lookup?id=${encodeURIComponent(
    id
  )}&fl=weergavenaam,gemeentenaam,centroide_ll,type,geometrie_ll`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data?.response?.docs?.[0];
  if (!doc?.centroide_ll) return null;

  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(doc.centroide_ll);
  if (!match) return null;

  return {
    weergavenaam: doc.weergavenaam,
    gemeentenaam: doc.gemeentenaam ?? "",
    lon: parseFloat(match[1]),
    lat: parseFloat(match[2]),
    bbox: AREA_TYPES.has(doc.type) ? bboxFromWkt(doc.geometrie_ll) ?? undefined : undefined,
  };
}

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ result: GeocodeResult | null; afstandMeter: number | null }> {
  const url = `${LOCATIESERVER_BASE}/reverse?lat=${lat}&lon=${lon}&rows=1&fl=weergavenaam,gemeentenaam,centroide_ll,afstand`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return { result: null, afstandMeter: null };
  const data = await res.json();
  const doc = data?.response?.docs?.[0];
  if (!doc) return { result: null, afstandMeter: null };

  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(doc.centroide_ll ?? "");

  return {
    result: {
      weergavenaam: doc.weergavenaam,
      gemeentenaam: doc.gemeentenaam ?? "",
      lon: match ? parseFloat(match[1]) : lon,
      lat: match ? parseFloat(match[2]) : lat,
    },
    afstandMeter: doc.afstand ?? null,
  };
}
