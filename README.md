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
- Locatiedata: `data/locations.json` (handmatig samengesteld startsetje) +
  `scripts/fetch-osm-toilets.mjs` om aan te vullen met alle OSM-toiletten in
  heel Nederland

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

## Meer locaties toevoegen

- Handmatig: voeg een object toe aan `data/locations.json`.
- Landelijk (heel NL, via OpenStreetMap): draai
  `npm run seed:osm > data/locations.osm.json` (buiten deze sandbox — het
  netwerk hier staat overpass-api.de niet toe) en voeg het resultaat samen
  met `data/locations.json`.

## Ontbrekende adressen aanvullen

De meeste OSM-toiletten hebben geen `addr:street`-tag, dus staat `address`
voor die locaties op `null` (zichtbaar op de kaart, maar zonder adres in de
lijst/detailweergave). Draai `npm run enrich:addresses` (buiten deze sandbox
— het netwerk hier staat api.pdok.nl niet toe) om die aan te vullen via
reverse geocoding op de gratis PDOK Locatieserver. Het script schrijft
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

- `data/locations.json` is een klein, handmatig gecureerd startsetje
  (voornamelijk grote steden) — geen volledige landelijke dekking. Uitbreiden
  via het OSM-importscript of handmatig.
- Coördinaten van het startsetje zijn op adres-/pleinniveau, niet
  gm-nauwkeurig geverifieerd.
- Reviews zijn door bezoekers geplaatst en niet geverifieerd door de
  toiletbeheerder — check zelf ter plekke.
