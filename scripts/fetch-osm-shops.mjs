// Vult data/locations.json aan met winkelketens uit OpenStreetMap voor NL
// die bekend staan om (klanten)toiletten: IKEA en Starbucks — via de gratis
// Overpass API. Losse, kleine queries per keten: een brede regex-scan over
// alle "shop"/"amenity" tags landelijk in één query duwt Overpass voorbij
// zijn timeout.
//
// Gebruik: node scripts/fetch-osm-shops.mjs > data/locations.shops.json

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const QUERIES = [
  {
    type: "warenhuis",
    priceHint: "Gratis voor klanten (IKEA)",
    ql: `
      area["ISO3166-1"="NL"][admin_level=2]->.nl;
      (
        node["shop"="furniture"]["name"~"IKEA", i](area.nl);
        way["shop"="furniture"]["name"~"IKEA", i](area.nl);
      );
      out center tags;
    `,
  },
  {
    type: "horeca",
    priceHint: "Gratis voor klanten (Starbucks)",
    ql: `
      area["ISO3166-1"="NL"][admin_level=2]->.nl;
      (
        node["amenity"="cafe"]["name"~"Starbucks", i](area.nl);
        way["amenity"="cafe"]["name"~"Starbucks", i](area.nl);
      );
      out center tags;
    `,
  },
];

// Overpass's front-end Apache rejects requests without a browser-like
// Accept/User-Agent (406), and the public instance frequently times out
// under load (504, or a runtime "Query timed out" remark inside a 200) —
// retry a few times with backoff before giving up.
async function fetchWithRetry(ql, attempts = 4) {
  const query = `[out:json][timeout:60];\n${ql}`;
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        "User-Agent": "gratisplassen/1.0 (+https://gratisplassen.vercel.app)",
      },
      body: "data=" + encodeURIComponent(query),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.remark) return data;
      if (i === attempts) throw new Error(`Overpass timed out: ${data.remark}`);
    } else if (i === attempts) {
      throw new Error(`Overpass request failed: ${res.status}`);
    }
    console.error(`Overpass attempt ${i}/${attempts} failed, retrying...`);
    await new Promise((r) => setTimeout(r, i * 5000));
  }
}

async function main() {
  const locations = [];

  for (const { type, priceHint, ql } of QUERIES) {
    const data = await fetchWithRetry(ql);
    for (const el of data.elements) {
      const tags = el.tags || {};
      if (!tags.name) continue;
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;

      locations.push({
        id: `osm-shop-${el.type}-${el.id}`,
        name: tags.name,
        type,
        address: [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]]
          .filter(Boolean)
          .join(" ") || null,
        lat,
        lon,
        paid: false,
        priceHint,
        wheelchair: tags.wheelchair === "yes",
        source: "OpenStreetMap (winkel/horeca met klantentoilet)",
      });
    }
  }

  process.stdout.write(JSON.stringify(locations, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
