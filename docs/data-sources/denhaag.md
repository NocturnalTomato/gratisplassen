# Den Haag — Gemeente open data

**Source:** Gemeente Den Haag open data portal (Opendatasoft), two datasets:

- `openbaretoiletten` — the main list of public toilets (name, address,
  location, wheelchair accessibility).
- `toegankelijkheidtoiletten` — a separate, larger accessibility-focused
  dataset (125 records) with opening hours, cost ("kosten"), and a MIVA
  (invalid-toilet) flag. It has no shared ID with `openbaretoiletten`, so
  records are cross-referenced by proximity (nearest match within 30m).

**Endpoints:**
```
https://den-haag-opendata.opendatasoft.com/api/explore/v2.1/catalog/datasets/openbaretoiletten/exports/json
https://den-haag-opendata.opendatasoft.com/api/explore/v2.1/catalog/datasets/toegankelijkheidtoiletten/exports/json
```

**License:** CC-0 (1.0) / CC-BY (4.0), Gemeente Den Haag.

**Contact:** datashop@denhaag.nl

**Snapshot:** `data/sources/denhaag.json` — 70 records, fetched 2026-07-27.

**To resync:**
```
node scripts/fetch-opendata-denhaag.mjs > data/sources/denhaag.json.tmp
```
then hand off to `scripts/merge-opendata-sources.mjs` (not yet built — someone
else is working on it) to merge into `data/locations.json`.

## Which fields are native vs. enriched

- `name`, `address`, `lat`/`lon`, `wheelchair` come straight from
  `openbaretoiletten` (`omschrijving`, `adres`, `geo_point_2d`,
  `rolstoel_toegankelijk`). `wheelchair` is **not** enriched from the
  accessibility dataset — testing showed the two datasets disagree on this
  (e.g. one toilet has no wheelchair flag in the main dataset but a MIVA
  flag in the accessibility one 21m away), so only the main dataset's own
  field is trusted.
- `paid`/`priceHint` are **not present at all** in `openbaretoiletten`. They
  come exclusively from `toegankelijkheidtoiletten`'s free-text `kosten`
  column, matched by proximity. Of the 70 locations: 3 resolved to paid
  (all "€ 0,50"), 2 resolved to free ("Gratis" / "€ 0,00"), and 65 have no
  accessibility-dataset match within 30m and stay `null` (unknown) rather
  than being guessed.
- `kosten` values that describe multiple prices (e.g. "€ 0,00 voor
  invaliden, € 0,50 voor anderen") are kept as-is in `priceHint` rather than
  reduced to one number, and marked `paid: true`.

## Coordinate system

Both datasets report `geo_point_2d` as WGS84 lat/lon (EPSG:4326) — no
reprojection needed.

## Caveats

- 12 of the 70 locations have no street address in the source data
  (`address: null`).
- Names are occasionally generic (e.g. repeated "Servicepunt XL",
  "MacDonalds ...") — several public/venue toilets share a naming pattern
  rather than a fully unique label.
- `openbaretoiletten` includes toilets hosted inside businesses (fast-food
  chains, libraries, service points) alongside standalone public
  facilities; there's no dataset field distinguishing them, unlike
  Amsterdam's urinal/toilet split.

## Overlap with existing data

`data/locations.json` already contains Den Haag entries sourced from
OpenStreetMap. Expect overlap/duplicates between this Gemeente dataset and
the existing OSM-derived entries at merge time — the merge script should
dedupe (e.g. by proximity + name similarity) rather than blindly
concatenating.
