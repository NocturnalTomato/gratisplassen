# Databronnen — overzicht

Zie de hoofd-[README](../../README.md#databronnen) voor hoe je een bron
ververst of samenvoegt. Dit bestand is de index van wat er per bron in dit
mapje staat, plus een lijst van gemeenten die zijn onderzocht maar niets
bruikbaars opleverden (zodat niemand dat werk per ongeluk overdoet).

## Bronnen met eigen writeup

- [`denhaag.md`](denhaag.md) — Gemeente Den Haag open data
- [`amsterdam.md`](amsterdam.md) — Gemeente Amsterdam open data
- [`groningen.md`](groningen.md) — Gemeente Groningen open data (alleen urinoirs, Diepenring)
- [`nijmegen.md`](nijmegen.md) — crowdsourced ArcGIS-kaart uit 2012, ongeverifieerd
- [`hogenood.md`](hogenood.md) — publieke (niet-authenticated) kaartdata van hogenood.nu

## Onderzocht, niets bruikbaars gevonden (juli 2026)

Geen machine-leesbare, netwerk-bereikbare toiletdataset gevonden voor:

- **Rotterdam** — `data.rotterdam.nl` doorzocht (1.439 datasets), niets toilet-gerelateerd
- **Utrecht (stad)** — `open.utrecht.nl` doorzocht, nul resultaten voor "toilet"
- **Leiden** — gemeente publiceert (nog) geen open data
- **Haarlem** — geen toiletlaag in GeoServer/WFS; een gemeenteraads-PDF met 9 locaties bestaat wel, maar was niet te bereiken (bot-bescherming)
- **Breda** — ArcGIS Online org doorzocht (298 items), geen toiletlaag
- **Tilburg** — GIS-portaal (VertiGIS Studio) heeft geen toegankelijke REST-services-lijst
- **Eindhoven, Arnhem, Maastricht, Zwolle, Enschede, Apeldoorn** — data.overheid.nl, ArcGIS Online en de eigen GIS-infrastructuur van elke gemeente doorzocht, niets gevonden (sommige GIS-servers waren netwerk-onbereikbaar, dus daar is "niet gevonden" niet 100% zeker)

Twee kanttekeningen bij deze lijst:

- `ckan.dataplatform.nl` (een gedeeld open-data-platform dat door meerdere
  gemeenten gebruikt wordt) was op het moment van onderzoek niet bereikbaar
  vanaf het netwerk waar dit is uitgezocht — als een bron daar wél iets heeft
  staan, is dat gemist. Waard om later opnieuw te proberen vanaf een ander
  netwerk.
- Een "niet gevonden" hierboven betekent niet dat de gemeente geen openbare
  toiletten heeft — alleen dat er geen open dataset van bestaat die we konden
  vinden. HogeNood's landelijke bulklaag dekt (een deel van) deze steden al
  wel, zij het zonder namen/adressen.
