// Vult data/locations.json aan met alle toiletten uit OpenStreetMap voor NL,
// via de gratis Overpass API. Draai dit los van de sandbox waarin dit project
// is opgezet (die heeft geen netwerktoegang tot overpass-api.de) — bijvoorbeeld
// lokaal of in een GitHub Action.
//
// Gebruik: node scripts/fetch-osm-toilets.mjs > data/locations.osm.json

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const query = `
  [out:json][timeout:180];
  area["ISO3166-1"="NL"][admin_level=2]->.nl;
  (
    node["amenity"="toilets"](area.nl);
    way["amenity"="toilets"](area.nl);
  );
  out center tags;
`;

async function main() {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) {
    throw new Error(`Overpass request failed: ${res.status}`);
  }
  const data = await res.json();

  const locations = data.elements.map((el) => {
    const tags = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const fee = tags.fee === "yes" ? true : tags.fee === "no" ? false : null;

    return {
      id: `osm-${el.type}-${el.id}`,
      name: tags.name || "Openbaar toilet",
      type: "osm",
      address: [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]]
        .filter(Boolean)
        .join(" ") || null,
      lat,
      lon,
      paid: fee,
      priceHint: tags.charge || null,
      wheelchair: tags.wheelchair === "yes",
      source: "OpenStreetMap (amenity=toilets)",
    };
  });

  process.stdout.write(JSON.stringify(locations, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
