// Vult data/locations.json aan met openbare toiletten uit de open data van
// Gemeente Amsterdam (maps.amsterdam.nl). Bevat zowel echte toiletten als
// stahoge urinoirs ("Amsterdamse krul", verzinkbare/overige urinoirs) — die
// laatste worden gemarkeerd via `amenityNote` zodat een merge-stap ze desgewenst
// kan uitsluiten (deze app gaat specifiek over toiletten om op te zitten).
//
// Gebruik: node scripts/fetch-opendata-amsterdam.mjs > data/locations.amsterdam.json

const AMSTERDAM_URL =
  "https://maps.amsterdam.nl/open_geodata/geojson_lnglat.php?KAARTLAAG=OPENBARE_TOILETTEN&THEMA=openbare_toiletten";

async function fetchWithRetry(url, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json,*/*",
        "User-Agent": "gratisplassen/1.0 (+https://gratisplassen.vercel.app)",
      },
    });
    if (res.ok) return res.json();
    if (i === attempts) {
      throw new Error(`Amsterdam open data request failed: ${res.status}`);
    }
    console.error(`Amsterdam open data ${res.status}, retry ${i}/${attempts - 1}...`);
    await new Promise((r) => setTimeout(r, i * 5000));
  }
}

function formatPrice(amount) {
  if (!amount || amount <= 0) return null;
  return `€${amount.toFixed(2).replace(".", ",")}`;
}

async function main() {
  const data = await fetchWithRetry(AMSTERDAM_URL);

  const locations = data.features.map((feature, i) => {
    const props = feature.properties || {};
    const [lon, lat] = feature.geometry?.coordinates ?? [null, null];
    const soort = props.Soort || "";
    const price = Number(props.Prijs_per_gebruik) || 0;
    const omschrijving = (props.Omschrijving || "").trim();
    const name = omschrijving
      ? `Openbaar toilet ${omschrijving}`
      : "Openbaar toilet Amsterdam";

    return {
      id: `ams-opendata-${i + 1}`,
      name,
      type: "openbaar",
      address: omschrijving ? `${omschrijving}, Amsterdam` : null,
      lat,
      lon,
      paid: price > 0,
      priceHint: formatPrice(price),
      wheelchair: /rolstoeltoegankelijk/i.test(soort),
      source: "Gemeente Amsterdam open data (maps.amsterdam.nl)",
      amenityNote: soort || null,
    };
  });

  process.stdout.write(JSON.stringify(locations, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
