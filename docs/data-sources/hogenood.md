# HogeNood open data

## What is HogeNood?

[HogeNood](https://www.hogenood.nl/) (a.k.a. hogenood.nu) is a commercial Dutch
product whose business is aggregating and curating public and "opengesteld"
(privately owned, publicly accessible) toilet locations across the
Netherlands and Belgium, presented via a map and API/embed products aimed at
municipalities and businesses.

## What this data source is — and is not

We pull from a single endpoint:

```
https://www.hogenood.nu/kaart/data/Toiletten_3.js
```

This is the raw data file that powers HogeNood's own public map page at
`https://www.hogenood.nu/kaart/`. It is a
[QGIS2web](https://github.com/tomchadwin/qgis2web)-style export: a plain-text
JavaScript file containing a single variable assignment,
`var json_Toiletten_3 = { ...GeoJSON FeatureCollection... };`. Our fetch
script strips the `var json_Toiletten_3 = ` prefix and trailing `;` to
recover a standard GeoJSON object, then parses the `features` array.

Each feature has only:
- a `geometry.coordinates` point (`[lon, lat]`)
- a `properties.toilet_typ` category, either `"openbaar"` (public toilet) or
  `"opengesteld"` (a privately owned toilet made accessible to the public)

**There are no names, addresses, opening hours, or prices in this dataset.**
It is bulk coverage only — ~7,400 point locations nationwide (NL/BE) with
just a coordinate and a coarse category. We preserve `toilet_typ` verbatim in
the normalized `type` field, and encode it into a generic Dutch `name` and,
for `opengesteld` entries, a `priceHint` note explaining the entry is a
privately owned toilet opened to the public (not necessarily free).

## Ethical / legal note — read this before reusing this endpoint elsewhere

This endpoint is served **publicly and without any authentication, referer
check, or User-Agent gate** — verified directly with `curl`. It is the exact
same data HogeNood's own public map page loads client-side for anyone who
visits it. An earlier investigation into this source explicitly looked for
and found a *separate*, genuinely gated endpoint —
`api.hogenood.com/view/toilet/iframe/...` — which enforces domain
allow-listing for embedding customers. **That gated endpoint was identified
and deliberately NOT used.** Only the plain, unauthenticated
`Toiletten_3.js` static file (the one behind HogeNood's own public map, with
no login or domain check) is fetched by `scripts/fetch-opendata-hogenood.mjs`.

That said, HogeNood is a commercial company whose product *is* this
aggregated dataset. Even though nothing here required bypassing auth:

- Keep an eye on HogeNood's Terms of Service and `robots.txt` for changes
  that would restrict this kind of automated access.
- If gratisplassen's usage of this data grows significant (e.g. becomes a
  primary source rather than a coverage fallback, or is used commercially),
  the better long-term path is to reach out for an official partnership —
  via `hogenood.nl/toilet-toevoegen` or a direct contact — rather than
  continuing to scrape the public map export indefinitely.

## Guidance for the merge script

`scripts/merge-opendata-sources.mjs` (built separately) should treat
`hogenood` as **LOW PRIORITY / fallback-only** in deduplication:

- HogeNood records have no name, address, or price — when a HogeNood point
  is close to (i.e. dedups against) a record from any other source, **prefer
  the other source's richer record** and drop/merge away the bare HogeNood
  point, since it has nothing extra to show the user beyond a location the
  other record already provides.
- Only keep a HogeNood-sourced record as-is when **no other source** has a
  matching location nearby — in that case it still adds real coverage value
  (a toilet exists here, even if we can't yet show its name/address).
- The `type` field (`openbaar` vs `opengesteld`) is worth surfacing/keeping
  even for otherwise-dropped duplicates, since it signals "privately owned
  but accessible" — a distinction some other sources also flag.

## Resyncing

```
npm run seed:opendata-hogenood
```

This runs `scripts/fetch-opendata-hogenood.mjs`, which:
1. Fetches `https://www.hogenood.nu/kaart/data/Toiletten_3.js` (with retry/
   backoff — the endpoint is occasionally slow/unreliable).
2. Strips the `var json_Toiletten_3 = ... ;` JS wrapper to recover GeoJSON.
3. Normalizes each feature into the shared location schema (`id` prefixed
   `hogenood-`, `type` set to the raw `toilet_typ`, `address`/`paid` left
   `null`, `wheelchair` defaulted `false` since it's not present in the
   source).
4. Writes the normalized JSON array to stdout.

To refresh the canonical snapshot at `data/sources/hogenood.json`, redirect
the script's output into a new `locations` array and bump `fetchedAt` /
`recordCount` accordingly (or use whatever helper `merge-opendata-sources.mjs`
provides once it lands). Do not edit `data/sources/hogenood.json` by hand for
anything other than these metadata fields — it should always reflect an
actual fetch.
