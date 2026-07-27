# 🚽 Gratis Plassen

Vind een toilet met een wc om op te zitten (geen urinoir) bij je in de buurt — gratis of betaald — met reviews
over schoonheid, wc-papier, handen wassen, maandverband/tampon-automaat en
douche. Als er niets dichtbij is, laat de site ook zien of wildplassen op die
plek waarschijnlijk wel/niet mag (geen juridisch advies).

## Stack

- **Next.js 14** (App Router, TypeScript) — React + API routes in één project
- **libSQL** (`@libsql/client`) voor reviews — lokaal een SQLite-bestand
  (`data/local.db`), in productie gratis [Turso](https://turso.tech) (géén
  Cloudflare nodig). Kan ook makkelijk naar Vercel Postgres of Neon.
- **Leaflet** + OpenStreetMap-tiles voor de kaart (gratis, geen API key)
- **PDOK Locatieserver** voor adres-zoeken/geocoding (gratis, geen key)
- Locatiedata: `data/locations.json` (10.000+ locaties), samengesteld uit een
  klein handmatig startsetje + OpenStreetMap + open data van een aantal
  gemeenten + HogeNood — zie [Databronnen](#databronnen) hieronder

## Herbruikte code

`lib/pdok.ts` en `lib/bebouwdeKom.ts` zijn overgenomen/aangepast uit het
`mag-ik-hier-wildplassen`-project (PDOK geocoding + bebouwde-kom-check),
gebruikt hier als fallback-antwoord wanneer er geen toilet in de buurt is.

## Lokaal draaien

```bash
npm install
cp .env.example .env.local   # vul evt. TURSO_* en IP_HASH_SECRET in
npm run dev
```

Zonder `TURSO_DATABASE_URL` gebruikt de app automatisch een lokaal
SQLite-bestand — geen setup nodig om te testen.

**Let op voor productie:** zonder `TURSO_DATABASE_URL` valt de app op Vercel
terug op `/tmp` (het enige schrijfbare pad in een serverless functie) — dat
is niet persistent en reviews kunnen verdwijnen tussen deploys/instances.
Zet dus altijd `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` voordat je live gaat
(gratis account op [turso.tech](https://turso.tech), duurt ~2 minuten).

## Databronnen

`data/locations.json` is opgebouwd uit meerdere bronnen:

| Bron | Dekking | Fetch-script |
|---|---|---|
| Handmatig startsetje | grote steden, kleine set | — (direct bewerken) |
| OpenStreetMap | heel NL — toiletten, fastfoodketens, tankstations, verzorgingsplaatsen, winkels | `npm run seed:osm`, `seed:osm-fastfood`, `seed:osm-fuel`, `seed:osm-restareas`, `seed:osm-shops` |
| Gemeente Den Haag (open data) | Den Haag | `npm run seed:opendata-denhaag` |
| Gemeente Amsterdam (open data) | Amsterdam | `npm run seed:opendata-amsterdam` |
| Gemeente Groningen (open data) | Diepenring, alleen urinoirs | `npm run seed:opendata-groningen` |
| Nijmegen (crowdsourced, 2012, ongeverifieerd) | Nijmegen | `npm run seed:opendata-nijmegen` |
| HogeNood (publieke kaartdata, geen namen/adressen) | heel NL + BE | `npm run seed:opendata-hogenood` |

Elke bron heeft een korte writeup (endpoint, licentie, bekende beperkingen) in
[`docs/data-sources/`](docs/data-sources/), en een bijbehorende snapshot in
`data/sources/<bron>.json` (met `fetchedAt`-datum) zodat je kunt zien wanneer
er voor het laatst gesynchroniseerd is.

**Een bron verversen of een nieuwe toevoegen:**

1. Draai het fetch-script van de bron (bijv. `npm run seed:opendata-denhaag`),
   schrijf de output naar `data/sources/<bron>.json` in hetzelfde
   snapshot-formaat (`sourceId`, `fetchedAt`, `endpoints`, `license`,
   `recordCount`, `locations`).
2. Draai `node scripts/merge-opendata-sources.mjs`. Dit voegt alleen *nieuwe*
   locaties toe (gededupliceerd op afstand + naam/adres-gelijkenis, zowel
   tegen bestaande locaties als tussen de nieuwe bronnen onderling) en
   overschrijft of verwijdert nooit bestaande entries — reviews in de database
   verwijzen naar `location_id`, dus verwijderen kan die wees maken. Het
   script schrijft een leesbaar rapport naar `docs/data-sources/MERGE_LOG.md`.
3. Als een gemeente een locatie heeft ingetrokken zie je dat niet automatisch
   terug (er wordt nooit iets verwijderd) — vergelijk zelf de oude en nieuwe
   `data/sources/<bron>.json` (bijv. via `git diff`) en verwijder handmatig uit
   `data/locations.json` als dat nodig is.

Er is bewust geen cron/scheduled job voor deze scripts — ze worden handmatig
gedraaid wanneer nodig.

Handmatig een locatie toevoegen kan ook gewoon door een object toe te voegen
aan `data/locations.json`.

## Ontbrekende adressen aanvullen

De meeste OSM-toiletten hebben geen `addr:street`-tag, dus staat `address`
voor die locaties op `null` (zichtbaar op de kaart, maar zonder adres in de
lijst/detailweergave). Draai `npm run enrich:addresses` om die aan te vullen
via reverse geocoding op de gratis PDOK Locatieserver. Het script schrijft
`data/locations.json` in place, slaat elke 50 locaties tussentijds op zodat
een onderbroken run hervat kan worden, en laat `address` bewust op `null`
staan als het dichtstbijzijnde adrespunt te ver weg ligt (>250m, bijv. bij
toiletten op verzorgingsplaatsen) in plaats van een verkeerd adres te
verzinnen.

## Misbruikbeperking bij reviews

Geen account nodig, wel:

- max. 2 reviews per locatie per IP-adres
- max. 5 reviews per uur per IP-adres (over alle locaties)
- honeypot-veld + minimale formulier-invultijd (2,5s) tegen bots
- exact dezelfde reactietekst van hetzelfde IP binnen 24u wordt geweigerd
- IP-adressen worden nooit ruw opgeslagen, alleen een gesalte HMAC-hash
  (`IP_HASH_SECRET`)

## Donaties

Het "☕ Trakteer me op koffie"-knopje linkt naar `NEXT_PUBLIC_DONATE_URL`.
Zet voor deploy je eigen Ko-fi/Buy Me a Coffee-link in de environment
variables (zie `.env.example`).

## Deployen naar Vercel

1. Push naar GitHub (zie hieronder).
2. Importeer de repo op [vercel.com](https://vercel.com/new).
3. Zet environment variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   (gratis db aanmaken op [turso.tech](https://turso.tech)),
   `IP_HASH_SECRET` (random string), `NEXT_PUBLIC_DONATE_URL`.
4. Deploy.

## Bekende beperkingen (MVP)

- Dekking is goed in grote steden en langs snelwegen (via OSM), maar
  wisselend in kleinere gemeenten — niet elke gemeente publiceert open
  toiletdata (zie [`docs/data-sources/`](docs/data-sources/) voor welke
  steden wel/niet zijn geprobeerd).
- De Nijmegen-bron is ongeverifieerd en uit 2012 — kan verouderd zijn.
  De HogeNood-bron heeft geen namen/adressen, alleen coördinaten + type.
- Coördinaten van het handmatige startsetje zijn op adres-/pleinniveau, niet
  gm-nauwkeurig geverifieerd.
- Reviews zijn door bezoekers geplaatst en niet geverifieerd door de
  toiletbeheerder — check zelf ter plekke.
