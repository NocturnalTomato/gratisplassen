# Groningen — Gemeente open data (urinoirs only)

**Source:** Gemeente Groningen open data, ArcGIS Feature Service
"Openbare toiletten aan de diepenring" (owner account: `adminGroningen`;
contact geoadvies@groningen.nl).

**Endpoint:**
```
https://services-eu1.arcgis.com/h3O43YQQl5FOo5XH/arcgis/rest/services/Openbare_toiletten_aan_de_diepenring/FeatureServer
```
Query layer 15 (`Openbaretoiletten_ExportFeatures`, the only feature layer
in the service) with `?where=1=1&outFields=*&f=geojson`.

**License:** Gemeente Groningen open data.

**Snapshot:** `data/sources/groningen.json` — 4 records, fetched
2026-07-27. Regenerate with:

```
npm run seed:opendata-groningen > /tmp/groningen.json
```

(then diff/replace `data/sources/groningen.json` as needed — the script
writes normalized JSON to stdout, matching the schema used in the snapshot).

## Coverage caveat — this is NOT a citywide inventory

This is an official gemeente dataset, but it covers **only the urinals
("Urinoirs") along the Diepenring canal in the city centre** — 4 records
total. It is not a citywide toilet inventory; there is currently no known
official open dataset covering the rest of Groningen. All 4 records are
free-standing urinals (no seat, not wheelchair accessible), so `paid` is
always `false` and `wheelchair` is always `false`.

## Recommendation for the merge script

Because coverage is so narrow, the merge script
(`scripts/merge-opendata-sources.mjs`, not yet built) should treat this
source as a small supplement rather than a primary source for Groningen —
most Groningen coverage in `data/locations.json` will need to keep coming
from OpenStreetMap or another source. Watch for overlap with existing
OSM-derived Diepenring entries and dedupe by proximity when merging.
