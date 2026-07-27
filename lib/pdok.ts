/**
 * Helpers rond de PDOK Locatieserver (BZK) — een gratis, publieke REST API
 * voor Nederlandse adres-geocoding, zonder API key.
 * Docs: https://api.pdok.nl/bzk/locatieserver/search/v3_1/ui/
 *
 * Herbruikt/aangepast uit het "mag-ik-hier-wildplassen" project.
 */

const LOCATIESERVER_BASE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";

export interface GeocodeResult {
  weergavenaam: string;
  gemeentenaam: string;
  lat: number;
  lon: number;
}

export async function geocodeAddress(
  query: string
): Promise<GeocodeResult | null> {
  const url = `${LOCATIESERVER_BASE}/free?q=${encodeURIComponent(
    query
  )}&rows=1&fq=type:(adres OR woonplaats OR postcode)&fl=weergavenaam,gemeentenaam,centroide_ll`;

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
  };
}

export interface AddressSuggestion {
  id: string;
  weergavenaam: string;
}

export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  const url = `${LOCATIESERVER_BASE}/suggest?q=${encodeURIComponent(
    query
  )}&rows=5&fq=type:(adres OR woonplaats OR postcode)&fl=id,weergavenaam`;

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
  )}&fl=weergavenaam,gemeentenaam,centroide_ll`;

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
