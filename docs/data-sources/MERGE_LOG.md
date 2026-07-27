# Merge log — open-data toiletten-bronnen

Laatst gedraaid: 2026-07-27T19:24:09.999Z

Totaal toegevoegd deze run: **5979** locaties. Nieuw totaal in data/locations.json: **10059**.

Dit logbestand wordt door `scripts/merge-opendata-sources.mjs` overschreven bij elke run — het toont
alleen de resultaten van de laatste synchronisatie, niet de volledige geschiedenis.

## denhaag

- Snapshot van: 2026-07-27
- Records in snapshot: 70
- Uitgefilterd (kwaliteit/relevantie): 0
- Al aanwezig (zelfde id, eerdere run): 0
- Duplicaat van bestaande locatie (<30m): 20
- **Nieuw toegevoegd: 50**

  Voorbeelden van gedetecteerde duplicaten (candidate → bestaande match):
  - "Toilet Huijgenspark" (denhaag-toilet-huijgenspark) → "Openbaar toilet" (osm-node-9177082901)
  - "Openbaar Toilet Zuiderpark" (denhaag-openbaar-toilet-zuiderpark) → "Openbaar toilet" (osm-node-11141981908)
  - "KFC toilet" (denhaag-kfc-toilet) → "KFC" (osm-fastfood-node-2718099707)
  - "Zeeruststraat Einde tramlijn 11" (denhaag-zeeruststraat-einde-tramlijn-11) → "Openbaar toilet" (osm-node-5424619831)
  - "Toilet Palace promenade" (denhaag-toilet-palace-promenade) → "Openbaar toilet" (osm-node-12592937337)

## amsterdam

- Snapshot van: 2026-07-27
- Records in snapshot: 106
- Uitgefilterd (kwaliteit/relevantie): 54
- Al aanwezig (zelfde id, eerdere run): 0
- Duplicaat van bestaande locatie (<30m): 15
- **Nieuw toegevoegd: 37**

  Voorbeelden van gedetecteerde duplicaten (candidate → bestaande match):
  - "Openbaar toilet Koningsplein" (ams-opendata-2) → "Openbaar toilet" (osm-node-2293578202)
  - "Openbaar toilet nabij openluchtheater" (ams-opendata-24) → "Openbaar toilet" (osm-way-222007696)
  - "Openbaar toilet Toilet bij kiosk, beheerd door de gemeente" (ams-opendata-33) → "Openbaar toilet" (osm-node-8214050815)
  - "Openbaar toilet Openbaar toilet bij het pierenbadje.
Gerenoveerd in 2019" (ams-opendata-35) → "Openbaar toilet" (osm-node-9047493760)
  - "Openbaar toilet Amsterdam" (ams-opendata-76) → "Openbaar toilet" (osm-node-6681608785)

## groningen

- Snapshot van: 2026-07-27
- Records in snapshot: 4
- Uitgefilterd (kwaliteit/relevantie): 0
- Al aanwezig (zelfde id, eerdere run): 0
- Duplicaat van bestaande locatie (<30m): 3
- **Nieuw toegevoegd: 1**

  Voorbeelden van gedetecteerde duplicaten (candidate → bestaande match):
  - "Openbaar urinoir Hoge der A" (groningen-1) → "Openbaar toilet" (osm-node-2657928015)
  - "Openbaar urinoir Kleine der A" (groningen-2) → "Openbaar toilet" (osm-node-1407080911)
  - "Openbaar urinoir Schuitendiep" (groningen-3) → "Openbaar toilet" (osm-node-2623616565)

## nijmegen

- Snapshot van: 2026-07-27
- Records in snapshot: 17
- Uitgefilterd (kwaliteit/relevantie): 4
- Al aanwezig (zelfde id, eerdere run): 0
- Duplicaat van bestaande locatie (<30m): 4
- **Nieuw toegevoegd: 9**

  Voorbeelden van gedetecteerde duplicaten (candidate → bestaande match):
  - "Station Nijmegen C.S." (nijmegen-1) → "Openbaar toilet" (osm-node-2847364293)
  - "Urilift" (nijmegen-10) → "Openbaar toilet" (osm-way-1234717486)
  - "Kiosk" (nijmegen-15) → "Openbaar toilet" (osm-node-4819433412)
  - "MariÃ«nburg" (nijmegen-16) → "Openbaar toilet" (osm-node-3798153310)

## hogenood

- Snapshot van: 2026-07-27
- Records in snapshot: 7402
- Uitgefilterd (kwaliteit/relevantie): 0
- Al aanwezig (zelfde id, eerdere run): 0
- Duplicaat van bestaande locatie (<40m): 1520
- **Nieuw toegevoegd: 5882**

  Voorbeelden van gedetecteerde duplicaten (candidate → bestaande match):
  - "Openbaar toilet" (hogenood-1) → "Openbaar toilet" (osm-node-7612928285)
  - "Openbaar toilet" (hogenood-2) → "Openbaar toilet" (osm-node-7612928286)
  - "Openbaar toilet" (hogenood-3) → "Openbaar toilet" (osm-node-4625672099)
  - "Toilet (particulier, opengesteld voor publiek)" (hogenood-4) → "Openbaar toilet" (osm-node-13340959076)
  - "Openbaar toilet" (hogenood-7) → "Openbaar toilet" (osm-node-2821792396)

## Volgende sync

Draai het bijbehorende `npm run seed:opendata-<bron>` script, dat schrijft een verse `data/sources/<bron>.json`. Draai daarna opnieuw `node scripts/merge-opendata-sources.mjs` — bestaande locaties (zelfde id) worden nooit overschreven of verwijderd, alleen nieuwe records worden toegevoegd. Als een locatie in de nieuwe snapshot ontbreekt die er in een vorige wel was, zie je dat niet automatisch terug hier (er wordt niets verwijderd) — vergelijk zelf `data/sources/<bron>.json` met de vorige versie via git history als je wilt weten wat een gemeente heeft ingetrokken.
