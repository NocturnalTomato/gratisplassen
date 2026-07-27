// Vult data/locations.json aan met tankstations/verzorgingsplaatsen uit
// OpenStreetMap voor NL die expliciet toilets=yes hebben getagd — via de
// gratis Overpass API. Handig voor onderweg (snelweg-verzorgingsplaatsen).
//
// Gebruik: node scripts/fetch-osm-fuel-toilets.mjs > data/locations.fuel.json

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const query = `
  [out:json][timeout:180];
  area["ISO3166-1"="NL"][admin_level=2]->.nl;
  (
    node["amenity"="fuel"]["toilets"="yes"](area.nl);
    way["amenity"="fuel"]["toilets"="yes"](area.nl);
  );
  out center tags;
`;

// Overpass's front-end Apache rejects requests without a browser-like
// Accept/User-Agent (406), and the public instance frequently times out
// under load (504) — retry a few times with backoff before giving up.
async function fetchWithRetry(attempts = 4) {
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
    if (res.ok) return res.json();
    if (i === attempts) {
      throw new Error(`Overpass request failed: ${res.status}`);
    }
    console.error(`Overpass ${res.status}, retry ${i}/${attempts - 1}...`);
    await new Promise((r) => setTimeout(r, i * 5000));
  }
}

async function main() {
  const data = await fetchWithRetry();

  const locations = data.elements.map((el) => {
    const tags = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const fee = tags.fee === "yes" ? true : tags.fee === "no" ? false : null;

    return {
      id: `osm-fuel-${el.type}-${el.id}`,
      name: tags.name ? `Tankstation ${tags.name}` : "Tankstation (toilet)",
      type: "tankstation",
      address: [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]]
        .filter(Boolean)
        .join(" ") || null,
      lat,
      lon,
      paid: fee,
      priceHint: tags.charge || null,
      wheelchair: tags.wheelchair === "yes",
      source: "OpenStreetMap (tankstation met toilets=yes)",
    };
  });

  process.stdout.write(JSON.stringify(locations, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
