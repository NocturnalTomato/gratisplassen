# Nijmegen — crowdsourced ArcGIS Online map (NOT official, LOW CONFIDENCE)

**Source:** an unofficial, crowdsourced ArcGIS Online web map titled
"Openbare toiletten in Nijmegen", created by an individual ArcGIS Online
user (`geurp0`) in 2012.

**This is NOT a Gemeente Nijmegen dataset.** There is no known official
open dataset of public toilets published by Gemeente Nijmegen. This web
map is the only public geodata found for Nijmegen, and it should be
treated with **low confidence**.

**Item page:**
```
https://www.arcgis.com/home/item.html?id=a2b1abc0bdc742d4b1372c1bd3774bef
```
The item is an ArcGIS Online "Web Map" — the actual point data is stored
inline as a feature collection in the map's JSON (`.../data?f=json`), in
Web Mercator (EPSG:3857) coordinates, not exposed as a standalone queryable
FeatureServer.

**License:** Unofficial/crowdsourced ArcGIS Online map, low confidence —
not gemeente-published.

**Snapshot:** `data/sources/nijmegen.json` — 17 records, fetched
2026-07-27. Regenerate with:

```
npm run seed:opendata-nijmegen > /tmp/nijmegen.json
```

(then diff/replace `data/sources/nijmegen.json` as needed — the script
writes normalized JSON to stdout, matching the schema used in the snapshot).

## Staleness — 14+ years old

The map was created and last modified in **April 2012** and has not been
updated since (14+ years as of 2026). Several entries are explicitly
marked as not-yet-existing or provisional in their `opmerking` (remark)
field, e.g.:

- "in aanbouw" (under construction)
- "in voorbereiding, alleen tijdens uitgaansavonden" (in preparation, only
  during nightlife evenings)
- "wordt Urilift" (will become a Urilift — not one yet, or was never
  finished)

These facilities may never have been completed, or may have been removed
entirely since 2012 — there is no way to confirm current status from this
source alone. `scripts/fetch-opendata-nijmegen.mjs` flags these records
with `lowConfidence: true` and a `note` field containing the raw remark
text, in addition to the rest of the dataset already being low confidence
overall.

## Recommendation for the merge script

For `scripts/merge-opendata-sources.mjs` (not yet built), for the Nijmegen
source specifically:

- **Skip records with `lowConfidence: true`** (the "in aanbouw" /
  "in voorbereiding" / "wordt Urilift" style entries) by default, since
  they describe facilities that may not exist — or **import them but mark
  them for manual review** (e.g. a `needsReview` flag surfaced in an admin
  UI) rather than trusting them at face value.
- Treat the remaining (non-flagged) records as still unverified given the
  2012 vintage of the whole dataset — ideally cross-check against
  OpenStreetMap or a newer source before merging into
  `data/locations.json`, and consider surfacing a "last confirmed 2012"
  note in the UI for any location that traces back to this source.
