// Vult data/locations.json aan met de urinoirs uit de open data van Gemeente
// Groningen (ArcGIS Feature Service "Openbare toiletten aan de diepenring").
//
// LET OP: deze dataset dekt alleen de urinoirs langs de Diepenring in het
// centrum, geen dekking voor de rest van de gemeente. Zie
// docs/data-sources/groningen.md voor achtergrond.
//
// Gebruik: node scripts/fetch-opendata-groningen.mjs > data/locations.groningen.json

const FEATURE_SERVER_URL =
  "https://services-eu1.arcgis.com/h3O43YQQl5FOo5XH/arcgis/rest/services/Openbare_toiletten_aan_de_diepenring/FeatureServer";
// Layer 15 ("Openbaretoiletten_ExportFeatures") is the only feature layer in
// this service; discovered via `${FEATURE_SERVER_URL}?f=json`.
const LAYER_ID = 15;
const QUERY_URL = `${FEATURE_SERVER_URL}/${LAYER_ID}/query?where=1%3D1&outFields=*&f=geojson`;

const SOURCE_LABEL =
  'Gemeente Groningen open data (ArcGIS: "Openbare toiletten aan de diepenring", ' +
  `${FEATURE_SERVER_URL})`;

async function fetchWithRetry(attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(QUERY_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "gratisplassen/1.0 (+https://gratisplassen.vercel.app)",
      },
    });
    if (res.ok) return res.json();
    if (i === attempts) {
      throw new Error(`ArcGIS request failed: ${res.status}`);
    }
    console.error(`ArcGIS ${res.status}, retry ${i}/${attempts - 1}...`);
    await new Promise((r) => setTimeout(r, i * 3000));
  }
}

async function main() {
  const geojson = await fetchWithRetry();

  const locations = geojson.features.map((feature) => {
    const props = feature.properties || {};
    const [lon, lat] = feature.geometry.coordinates;
    const street = (props.omschrijvd || "").trim() || null;

    return {
      id: `groningen-${props.objectid}`,
      name: street ? `Openbaar urinoir ${street}` : "Openbaar urinoir",
      type: "openbaar",
      address: street,
      lat,
      lon,
      paid: false,
      priceHint: null,
      wheelchair: false,
      source: SOURCE_LABEL,
    };
  });

  process.stdout.write(JSON.stringify(locations, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
