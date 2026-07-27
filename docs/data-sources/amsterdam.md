# Amsterdam — Gemeente open data

**Source:** Gemeente Amsterdam open data, "Openbare toiletten" laag on
`maps.amsterdam.nl`.

**Endpoint:**
```
https://maps.amsterdam.nl/open_geodata/geojson_lnglat.php?KAARTLAAG=OPENBARE_TOILETTEN&THEMA=openbare_toiletten
```

**License:** Gemeente Amsterdam open data.

**Snapshot:** `data/sources/amsterdam.json` — 106 records, fetched
2026-07-27. Regenerate with:

```
npm run seed:opendata-amsterdam > /tmp/amsterdam.json
```

(then diff/replace `data/sources/amsterdam.json` as needed — the script
writes normalized JSON to stdout, matching the schema used in the snapshot).

## Urinal vs. real-toilet breakdown

Of the 106 records, only **52 are real toilets** (seated, enclosed). The
other **54 are urinal-only fixtures** with no seat — these are tagged via
the raw Dutch `Soort` field, preserved on each record as `amenityNote`:

- "Amsterdamse krul" — the classic open-air street urinal
- "Verzinkbaar urinoir" — retractable/pop-up urinal ("Urilift")
- "Overig urinoir" — other urinal types (e.g. "Green Pee")

Real-toilet records have `amenityNote` values like "Openbaar toilet",
"Openbaar toilet, rolstoeltoegankelijk", or "Toilet in parkeergarage".

**Recommendation for the merge script** (`scripts/merge-opendata-sources.mjs`,
not yet built): this app is specifically about toilets you can sit on, so
the merge step should **exclude records whose `amenityNote` contains
"krul" or "urinoir"** (case-insensitive) rather than importing all 106.
That leaves the 52 real toilets to merge in.

## Overlap with existing data

`data/locations.json` already contains Amsterdam entries sourced from
OpenStreetMap. Expect overlap/duplicates between this Gemeente dataset and
the existing OSM-derived entries at merge time — the merge script should
dedupe (e.g. by proximity + name similarity) rather than blindly
concatenating.
