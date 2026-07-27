// Vult ontbrekende adressen in data/locations.json aan via reverse geocoding
// op de gratis PDOK Locatieserver (BZK) — vooral nodig voor de OSM-import,
// waar amenity=toilets zelden een addr:street-tag heeft.
//
// Gebruik: node scripts/enrich-addresses.mjs
// (schrijft data/locations.json in place, met tussentijds opslaan zodat een
// onderbroken run hervat kan worden — al ingevulde adressen worden overgeslagen)

import { readFileSync, writeFileSync } from "node:fs";

const DATA_PATH = new URL("../data/locations.json", import.meta.url);
const LOCATIESERVER_BASE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";

// Boven deze afstand (in meters) tot het dichtstbijzijnde adrespunt vertrouwen
// we de match niet — bijv. een toilet midden op een verzorgingsplaats zonder
// adres in de buurt. Dan laten we address op null staan i.p.v. een verkeerd
// adres te verzinnen.
const MAX_DISTANCE_METERS = 250;
const DELAY_MS = 150; // wees aardig voor de gratis publieke API
const SAVE_EVERY = 50;

async function reverseGeocode(lat, lon, attempts = 3) {
  const url = `${LOCATIESERVER_BASE}/reverse?lat=${lat}&lon=${lon}&rows=1&fq=type:adres&fl=weergavenaam,afstand`;

  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "gratisplassen/1.0 (+https://gratisplassen.vercel.app)" },
      });
      if (res.ok) {
        const data = await res.json();
        return data?.response?.docs?.[0] ?? null;
      }
      if (i === attempts) return null;
    } catch {
      if (i === attempts) return null;
    }
    await new Promise((r) => setTimeout(r, i * 1000));
  }
  return null;
}

async function main() {
  const locations = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const todo = locations.filter((l) => !l.address && typeof l.lat === "number" && typeof l.lon === "number");

  console.error(`${todo.length} locaties zonder adres, van ${locations.length} totaal.`);

  let filled = 0;
  let tooFar = 0;
  let notFound = 0;

  for (let i = 0; i < todo.length; i++) {
    const loc = todo[i];
    const doc = await reverseGeocode(loc.lat, loc.lon);

    if (!doc) {
      notFound++;
    } else if (typeof doc.afstand === "number" && doc.afstand > MAX_DISTANCE_METERS) {
      tooFar++;
    } else {
      loc.address = doc.weergavenaam;
      filled++;
    }

    if ((i + 1) % SAVE_EVERY === 0 || i === todo.length - 1) {
      writeFileSync(DATA_PATH, JSON.stringify(locations, null, 2) + "\n");
      console.error(
        `${i + 1}/${todo.length} verwerkt — ${filled} ingevuld, ${tooFar} te ver weg, ${notFound} niet gevonden.`
      );
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.error(`Klaar. ${filled} adressen ingevuld, ${tooFar} overgeslagen (te ver weg), ${notFound} niet gevonden.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
