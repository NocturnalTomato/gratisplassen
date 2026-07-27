// Vult data/locations.json aan met toiletten uit een crowdsourced ArcGIS
// Online webkaart "Openbare toiletten in Nijmegen".
//
// LET OP: dit is GEEN officiële dataset van Gemeente Nijmegen. Het is een
// webkaart die in 2012 door een individuele gebruiker is gemaakt en sindsdien
// niet is bijgewerkt (14+ jaar oud). Sommige entries zijn letterlijk gemarkeerd
// als "in aanbouw" / "in voorbereiding" / "wordt Urilift", wat betekent dat de
// voorziening er mogelijk nooit kwam, of inmiddels weer is verdwenen.
// LAGE BETROUWBAARHEID — zie docs/data-sources/nijmegen.md voor achtergrond
// en aanbevelingen voor het merge-script.
//
// Gebruik: node scripts/fetch-opendata-nijmegen.mjs > data/locations.nijmegen.json

const ITEM_ID = "a2b1abc0bdc742d4b1372c1bd3774bef";
const ITEM_DATA_URL = `https://www.arcgis.com/sharing/rest/content/items/${ITEM_ID}/data?f=json`;

const SOURCE_LABEL =
  'Crowdsourced ArcGIS Online kaart "Openbare toiletten in Nijmegen" (2012, ' +
  "niet-officieel/gemeentelijk, mogelijk verouderd; " +
  `https://www.arcgis.com/home/item.html?id=${ITEM_ID})`;

async function fetchWithRetry(attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(ITEM_DATA_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "gratisplassen/1.0 (+https://gratisplassen.vercel.app)",
      },
    });
    if (res.ok) return res.json();
    if (i === attempts) {
      throw new Error(`ArcGIS Online request failed: ${res.status}`);
    }
    console.error(`ArcGIS Online ${res.status}, retry ${i}/${attempts - 1}...`);
    await new Promise((r) => setTimeout(r, i * 3000));
  }
}

// The web map stores geometry in Web Mercator (wkid 102100 / 3857), not
// WGS84 lat/lon, so it needs converting.
const EARTH_RADIUS = 6378137;
function webMercatorToLatLon(x, y) {
  const lon = (x / EARTH_RADIUS) * (180 / Math.PI);
  const lat =
    (Math.PI / 2 - 2 * Math.atan(Math.exp(-y / EARTH_RADIUS))) * (180 / Math.PI);
  return { lat, lon };
}

// "hdg" holds a combination of H(eren)/D(ames)/G(ehandicapt) letters
// indicating which facilities are present; presence of "G" means a
// wheelchair-accessible toilet is available.
function isWheelchairAccessible(hdg) {
  return typeof hdg === "string" && hdg.toUpperCase().includes("G");
}

// "kosten" (cost) is free text: "gratis", "onbekend", blank, or a price like
// "20 ct". Normalize it into paid/priceHint like the other sources.
function parseCost(kosten) {
  const value = (kosten || "").trim().toLowerCase();
  if (!value || value === "onbekend") return { paid: null, priceHint: null };
  if (value === "gratis") return { paid: false, priceHint: null };
  return { paid: true, priceHint: kosten.trim() };
}

async function main() {
  const data = await fetchWithRetry();
  const layer = data.operationalLayers?.[0]?.featureCollection?.layers?.[0];
  if (!layer) {
    throw new Error("Unexpected web map structure: no feature layer found");
  }

  const locations = layer.featureSet.features.map((feature) => {
    const attrs = feature.attributes || {};
    const { lat, lon } = webMercatorToLatLon(feature.geometry.x, feature.geometry.y);
    const { paid, priceHint } = parseCost(attrs.kosten);
    // Flag stale/unbuilt entries so downstream merge logic can treat them
    // with extra caution instead of trusting them at face value.
    const opmerking = (attrs.opmerking || "").trim();
    const lowConfidencePattern = /in aanbouw|in voorbereiding|wordt urilift/i;
    const lowConfidence = lowConfidencePattern.test(opmerking);

    return {
      id: `nijmegen-${attrs.FID + 1}`,
      name: attrs.naam || "Openbaar toilet",
      type: "openbaar",
      address: null,
      lat,
      lon,
      paid,
      priceHint,
      wheelchair: isWheelchairAccessible(attrs.hdg),
      source: SOURCE_LABEL,
      ...(lowConfidence ? { lowConfidence: true, note: opmerking } : {}),
    };
  });

  process.stdout.write(JSON.stringify(locations, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
