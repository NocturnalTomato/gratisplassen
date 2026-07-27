// Vult data/ aan met openbare toiletten uit de open data van gemeente Den Haag.
//
// Bronnen (Den Haag Opendata / Opendatasoft):
//  - openbaretoiletten: de hoofdlijst van openbare toiletten (naam, locatie).
//  - toegankelijkheidtoiletten: aanvullende toegankelijkheidsinfo (rolstoel,
//    prijs) die we op basis van nabijheid (~30m) koppelen aan de hoofdlijst,
//    omdat beide datasets geen gedeeld ID hebben.
//
// Gebruik: node scripts/fetch-opendata-denhaag.mjs > data/sources/denhaag.json.tmp

const TOILETS_URL =
  "https://den-haag-opendata.opendatasoft.com/api/explore/v2.1/catalog/datasets/openbaretoiletten/exports/json";
const ACCESSIBILITY_URL =
  "https://den-haag-opendata.opendatasoft.com/api/explore/v2.1/catalog/datasets/toegankelijkheidtoiletten/exports/json";

// Max afstand (in meters) tussen een toilet en een toegankelijkheidsrecord om
// ze als dezelfde locatie te beschouwen.
const MATCH_DISTANCE_METERS = 30;

async function fetchWithRetry(url, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "gratisplassen/1.0 (+https://gratisplassen.vercel.app)",
      },
    });
    if (res.ok) return res.json();
    if (i === attempts) {
      throw new Error(`${url} request failed: ${res.status}`);
    }
    console.error(`${url} -> ${res.status}, retry ${i}/${attempts - 1}...`);
    await new Promise((r) => setTimeout(r, i * 5000));
  }
}

// Haversine-afstand in meters tussen twee lat/lon-punten.
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// De accessibiliteitsdataset heeft een vrije-tekst "kosten" kolom (bv. "€ 0,50",
// "Gratis", "geen", "0,00 euro", of soms een beschrijvende prijs met
// uitzonderingen). We proberen dat te herleiden tot paid/priceHint; lukt dat
// niet omdat de tekst meerdere prijzen beschrijft, dan geven we de ruwe tekst
// door als priceHint en markeren we de locatie als betaald (er staat immers
// een bedrag > 0 in).
function parseKosten(raw) {
  if (raw === undefined || raw === null) return { paid: null, priceHint: null };
  const cleaned = String(raw).trim();
  if (cleaned === "") return { paid: null, priceHint: null };
  if (/^(geen|gratis)$/i.test(cleaned)) return { paid: false, priceHint: null };

  const simpleMatch = cleaned.match(/^€?\s*([\d.,]+)\s*(euro)?$/i);
  if (simpleMatch) {
    const num = parseFloat(simpleMatch[1].replace(",", "."));
    if (!Number.isNaN(num)) {
      if (num === 0) return { paid: false, priceHint: null };
      return { paid: true, priceHint: `€ ${num.toFixed(2).replace(".", ",")}` };
    }
  }

  // Beschrijvende tekst (bv. verschillende prijzen voor klanten/anderen).
  return { paid: true, priceHint: cleaned };
}

function parseWheelchair(rec) {
  return String(rec.rolstoel_toegankelijk ?? "").toLowerCase() === "ja";
}

function extractLatLon(rec) {
  // Opendatasoft exports geo fields as a geo_point_2d {lat, lon} object.
  const geo = rec.geo_point_2d;
  if (geo && typeof geo === "object" && !Array.isArray(geo)) {
    if (typeof geo.lat === "number" && typeof geo.lon === "number") {
      return { lat: geo.lat, lon: geo.lon };
    }
  }
  const lat = rec.lat ?? rec.latitude;
  const lon = rec.lon ?? rec.lng ?? rec.longitude;
  if (typeof lat === "number" && typeof lon === "number") return { lat, lon };
  return null;
}

function buildAddress(rec) {
  if (!rec.adres) return null;
  return `${rec.adres}, Den Haag`;
}

function buildName(rec, index) {
  return rec.omschrijving || `Openbaar toilet ${index + 1}`;
}

async function main() {
  const [toiletData, accessibilityData] = await Promise.all([
    fetchWithRetry(TOILETS_URL),
    fetchWithRetry(ACCESSIBILITY_URL),
  ]);

  const toilets = Array.isArray(toiletData) ? toiletData : [];
  const accessibilityRecords = (Array.isArray(accessibilityData) ? accessibilityData : [])
    .map((rec) => ({ rec, coords: extractLatLon(rec) }))
    .filter((r) => r.coords);

  const usedIds = new Set();
  const locations = toilets.map((rec, index) => {
    const coords = extractLatLon(rec);
    const name = buildName(rec, index);

    let baseId = `denhaag-${slugify(name)}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix++}`;
    }
    usedIds.add(id);

    // Wheelchair accessibility is native to the main dataset.
    const wheelchair = parseWheelchair(rec);

    // paid/priceHint are not present in the main dataset at all — they come
    // exclusively from the accessibility dataset's "kosten" column, matched
    // by proximity since the two datasets share no common ID.
    let paid = null;
    let priceHint = null;
    if (coords) {
      let closest = null;
      let closestDist = Infinity;
      for (const candidate of accessibilityRecords) {
        const d = distanceMeters(coords.lat, coords.lon, candidate.coords.lat, candidate.coords.lon);
        if (d < closestDist) {
          closestDist = d;
          closest = candidate;
        }
      }
      if (closest && closestDist <= MATCH_DISTANCE_METERS) {
        const kosten = parseKosten(closest.rec.kosten);
        paid = kosten.paid;
        priceHint = kosten.priceHint;
      }
    }

    return {
      id,
      name,
      type: "openbaar",
      address: buildAddress(rec),
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      paid,
      priceHint,
      wheelchair,
      source: "Gemeente Den Haag open data (data.overheid.nl, CC-0/CC-BY)",
    };
  });

  process.stdout.write(JSON.stringify(locations, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
