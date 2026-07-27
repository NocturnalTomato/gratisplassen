// Vult data/locations.json aan met fastfoodketens uit OpenStreetMap voor NL
// (McDonald's, Burger King, KFC, Subway) — vestigingen van deze ketens hebben
// vrijwel altijd een (klanten)toilet, via de gratis Overpass API.
//
// Gebruik: node scripts/fetch-osm-fastfood.mjs > data/locations.fastfood.json

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const BRANDS = ["McDonald's", "Burger King", "KFC", "Subway"];
const brandRegex = BRANDS.join("|");

const query = `
  [out:json][timeout:180];
  area["ISO3166-1"="NL"][admin_level=2]->.nl;
  (
    node["amenity"="fast_food"]["name"~"${brandRegex}", i](area.nl);
    way["amenity"="fast_food"]["name"~"${brandRegex}", i](area.nl);
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

function brandOf(name) {
  return BRANDS.find((b) => name.toLowerCase().includes(b.toLowerCase())) ?? name;
}

async function main() {
  const data = await fetchWithRetry();

  const locations = data.elements
    .filter((el) => el.tags?.name)
    .map((el) => {
      const tags = el.tags || {};
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const brand = brandOf(tags.name);

      return {
        id: `osm-fastfood-${el.type}-${el.id}`,
        name: tags.name,
        type: "fastfood",
        address: [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]]
          .filter(Boolean)
          .join(" ") || null,
        lat,
        lon,
        paid: false,
        priceHint: `Gratis voor klanten (${brand})`,
        wheelchair: tags.wheelchair === "yes",
        source: "OpenStreetMap (fastfoodketen)",
      };
    });

  process.stdout.write(JSON.stringify(locations, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
