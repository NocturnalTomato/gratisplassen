// Voegt de gesynchroniseerde snapshots in data/sources/*.json samen met
// data/locations.json, met deduplicatie op afstand + naam/adres-gelijkenis.
//
// Ontworpen om herhaaldelijk gedraaid te kunnen worden wanneer een bron een
// nieuwe snapshot krijgt (via de bijbehorende scripts/fetch-opendata-*.mjs):
// bestaande locaties worden NOOIT verwijderd (reviews in de database
// verwijzen naar location_id), records die niet meer in een verse fetch
// voorkomen worden alleen gerapporteerd, niet stilzwijgend weggehaald.
//
// Gebruik: node scripts/merge-opendata-sources.mjs
// (schrijft data/locations.json in place, en een leesbaar rapport naar
// docs/data-sources/MERGE_LOG.md)

import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const SOURCES_DIR = new URL("../data/sources/", import.meta.url);
const LOCATIONS_PATH = new URL("../data/locations.json", import.meta.url);
const MERGE_LOG_PATH = new URL("../docs/data-sources/MERGE_LOG.md", import.meta.url);

// Volgorde bepaalt prioriteit bij een botsing tussen twee NIEUWE bronnen op
// dezelfde plek: eerdere bronnen hebben rijkere data (naam/adres) en winnen.
// HogeNood staat expliciet laatst — puur coördinaten+type, geen naam/adres,
// dus alleen toevoegen als niets anders die plek al dekt.
const SOURCE_ORDER = ["denhaag", "amsterdam", "groningen", "nijmegen", "hogenood"];

const DEDUPE_METERS = 30;
const DEDUPE_METERS_HOGENOOD = 40; // ruimer: geen naam om op te disambigueren

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function normalizeText(s) {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritics
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Simpele token-overlap i.p.v. een zware string-distance library — genoeg
// om "Toilet Huijgenspark" tegen "Openbaar toilet Huijgenspark" te matchen.
function nameSimilar(a, b) {
  const ta = new Set(normalizeText(a).split(" ").filter((w) => w.length > 2));
  const tb = new Set(normalizeText(b).split(" ").filter((w) => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return false;
  let overlap = 0;
  for (const w of ta) if (tb.has(w)) overlap++;
  return overlap / Math.min(ta.size, tb.size) >= 0.5;
}

function isDuplicate(candidate, existing, radiusMeters) {
  if (typeof candidate.lat !== "number" || typeof candidate.lon !== "number") return null;
  for (const loc of existing) {
    if (typeof loc.lat !== "number" || typeof loc.lon !== "number") continue;
    const dist = haversineMeters(candidate.lat, candidate.lon, loc.lat, loc.lon);
    if (dist > radiusMeters) continue;
    // Binnen straal: bij twijfel (net iets verder dan de helft) alleen als
    // duplicaat tellen wanneer de naam ook overeenkomt, om te voorkomen dat
    // twee losse toiletten vlak bij elkaar (bijv. metrostation + winkel) ten
    // onrechte worden samengevoegd.
    if (dist <= radiusMeters / 2) return loc;
    if (nameSimilar(candidate.name, loc.name) || nameSimilar(candidate.address, loc.address)) {
      return loc;
    }
  }
  return null;
}

function loadSource(sourceId) {
  const path = new URL(`${sourceId}.json`, SOURCES_DIR);
  const wrapper = JSON.parse(readFileSync(path, "utf-8"));
  return wrapper;
}

function filterCandidates(sourceId, locations) {
  const dropped = [];
  const kept = [];

  for (const loc of locations) {
    if (typeof loc.lat !== "number" || typeof loc.lon !== "number") {
      dropped.push({ loc, reason: "geen geldige coördinaten" });
      continue;
    }
    if (sourceId === "amsterdam" && /krul|urinoir/i.test(loc.amenityNote || "")) {
      dropped.push({ loc, reason: `urinoir zonder zitgelegenheid (${loc.amenityNote})` });
      continue;
    }
    if (sourceId === "nijmegen" && loc.lowConfidence) {
      dropped.push({ loc, reason: `laag vertrouwen, ongeverifieerd (${loc.note || "n/a"})` });
      continue;
    }
    kept.push(loc);
  }

  return { kept, dropped };
}

function main() {
  const locations = JSON.parse(readFileSync(LOCATIONS_PATH, "utf-8"));
  const existingIds = new Set(locations.map((l) => l.id));

  const availableSources = readdirSync(SOURCES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
  const orderedSources = [
    ...SOURCE_ORDER.filter((s) => availableSources.includes(s)),
    ...availableSources.filter((s) => !SOURCE_ORDER.includes(s)),
  ];

  const report = [];
  let totalAdded = 0;

  for (const sourceId of orderedSources) {
    const wrapper = loadSource(sourceId);
    const { kept, dropped } = filterCandidates(sourceId, wrapper.locations);

    const radius = sourceId === "hogenood" ? DEDUPE_METERS_HOGENOOD : DEDUPE_METERS;
    const added = [];
    const skippedDuplicate = [];
    const skippedExistingId = [];

    for (const candidate of kept) {
      if (existingIds.has(candidate.id)) {
        skippedExistingId.push(candidate);
        continue;
      }
      const dupe = isDuplicate(candidate, locations, radius);
      if (dupe) {
        skippedDuplicate.push({ candidate, matchedId: dupe.id, matchedName: dupe.name });
        continue;
      }
      locations.push(candidate);
      existingIds.add(candidate.id);
      added.push(candidate);
    }

    totalAdded += added.length;

    report.push({
      sourceId,
      fetchedAt: wrapper.fetchedAt,
      recordCount: wrapper.locations.length,
      filteredOut: dropped,
      added: added.length,
      alreadyPresent: skippedExistingId.length,
      duplicatesOfOtherLocations: skippedDuplicate.length,
      duplicateSamples: skippedDuplicate.slice(0, 5),
    });

    console.error(
      `${sourceId}: ${wrapper.locations.length} records → ${dropped.length} gefilterd, ` +
        `${skippedExistingId.length} al aanwezig, ${skippedDuplicate.length} duplicaat, ${added.length} toegevoegd`
    );
  }

  writeFileSync(LOCATIONS_PATH, JSON.stringify(locations, null, 2) + "\n");

  const logLines = [
    "# Merge log — open-data toiletten-bronnen",
    "",
    `Laatst gedraaid: ${new Date().toISOString()}`,
    "",
    `Totaal toegevoegd deze run: **${totalAdded}** locaties. Nieuw totaal in data/locations.json: **${locations.length}**.`,
    "",
    "Dit logbestand wordt door `scripts/merge-opendata-sources.mjs` overschreven bij elke run — het toont",
    "alleen de resultaten van de laatste synchronisatie, niet de volledige geschiedenis.",
    "",
  ];

  for (const r of report) {
    logLines.push(`## ${r.sourceId}`);
    logLines.push("");
    logLines.push(`- Snapshot van: ${r.fetchedAt}`);
    logLines.push(`- Records in snapshot: ${r.recordCount}`);
    logLines.push(`- Uitgefilterd (kwaliteit/relevantie): ${r.filteredOut.length}`);
    logLines.push(`- Al aanwezig (zelfde id, eerdere run): ${r.alreadyPresent}`);
    logLines.push(`- Duplicaat van bestaande locatie (<${r.sourceId === "hogenood" ? DEDUPE_METERS_HOGENOOD : DEDUPE_METERS}m): ${r.duplicatesOfOtherLocations}`);
    logLines.push(`- **Nieuw toegevoegd: ${r.added}**`);
    if (r.duplicateSamples.length > 0) {
      logLines.push("");
      logLines.push("  Voorbeelden van gedetecteerde duplicaten (candidate → bestaande match):");
      for (const s of r.duplicateSamples) {
        logLines.push(`  - "${s.candidate.name}" (${s.candidate.id}) → "${s.matchedName}" (${s.matchedId})`);
      }
    }
    logLines.push("");
  }

  logLines.push("## Volgende sync");
  logLines.push("");
  logLines.push(
    "Draai het bijbehorende `npm run seed:opendata-<bron>` script, dat schrijft een verse " +
      "`data/sources/<bron>.json`. Draai daarna opnieuw `node scripts/merge-opendata-sources.mjs` — " +
      "bestaande locaties (zelfde id) worden nooit overschreven of verwijderd, alleen nieuwe records worden " +
      "toegevoegd. Als een locatie in de nieuwe snapshot ontbreekt die er in een vorige wel was, zie je dat " +
      "niet automatisch terug hier (er wordt niets verwijderd) — vergelijk zelf `data/sources/<bron>.json` " +
      "met de vorige versie via git history als je wilt weten wat een gemeente heeft ingetrokken."
  );
  logLines.push("");

  writeFileSync(MERGE_LOG_PATH, logLines.join("\n"));

  console.error(`\nKlaar. ${totalAdded} nieuwe locaties toegevoegd. Rapport: docs/data-sources/MERGE_LOG.md`);
}

main();
