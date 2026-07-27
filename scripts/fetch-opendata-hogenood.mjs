// Vult data/locations.json aan met openbare/opengestelde toiletten uit de
// HogeNood-kaart, via hun publiek toegankelijke (niet-geauthenticeerde)
// QGIS2web data-export die hun eigen kaartpagina voedt.
//
// LET OP: dit endpoint levert alleen coördinaten + een grove categorie
// ("openbaar" of "opengesteld"), GEEN namen, adressen of prijzen. Zie
// docs/data-sources/hogenood.md voor de volledige uitleg, het ethische/
// juridische kader en het advies om deze bron als laagste prioriteit te
// behandelen bij het samenvoegen met rijkere bronnen.
//
// Gebruik: node scripts/fetch-opendata-hogenood.mjs > data/locations.hogenood.json

const HOGENOOD_URL = "https://www.hogenood.nu/kaart/data/Toiletten_3.js";

// De data wordt als plain-text JS-bestand geserveerd (QGIS2web export), niet
// als pure JSON: het bestand bestaat uit één regel van de vorm
//   var json_Toiletten_3 = { ...GeoJSON FeatureCollection... };
// Er is geen auth/referer/User-Agent-check nodig (geverifieerd met curl) —
// dit is dezelfde data die hogenood.nu's eigen publieke kaartpagina gebruikt.
// De server is soms traag/onbetrouwbaar onder load, dus retry met backoff.
async function fetchWithRetry(attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(HOGENOOD_URL, {
      headers: {
        Accept: "*/*",
        "User-Agent": "gratisplassen/1.0 (+https://gratisplassen.vercel.app)",
      },
    });
    if (res.ok) return res.text();
    if (i === attempts) {
      throw new Error(`HogeNood request failed: ${res.status}`);
    }
    console.error(`HogeNood ${res.status}, retry ${i}/${attempts - 1}...`);
    await new Promise((r) => setTimeout(r, i * 5000));
  }
}

function parseGeoJson(text) {
  // Strip the "var json_Toiletten_3 = " assignment prefix and the trailing
  // ";" so we're left with a plain JSON object literal.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Unexpected response format: no JSON object found");
  }
  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}

function priceHintFor(toiletType) {
  return toiletType === "opengesteld"
    ? "opengesteld (particulier toilet publiek toegankelijk)"
    : null;
}

function nameFor(toiletType) {
  return toiletType === "opengesteld"
    ? "Toilet (particulier, opengesteld voor publiek)"
    : "Openbaar toilet";
}

async function main() {
  const text = await fetchWithRetry();
  const geojson = parseGeoJson(text);

  const locations = geojson.features.map((feature, i) => {
    const toiletType = feature.properties?.toilet_typ || "openbaar";
    const [lon, lat] = feature.geometry.coordinates;

    return {
      id: `hogenood-${i + 1}`,
      name: nameFor(toiletType),
      type: toiletType,
      address: null,
      lat,
      lon,
      paid: null,
      priceHint: priceHintFor(toiletType),
      wheelchair: false,
      source: "HogeNood (public embed API)",
    };
  });

  process.stdout.write(JSON.stringify(locations, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
