# PostNord: antaganden, avvikelser och anpassningar

Labb 5 använder två av PostNords API:er:

- **Service Points V5** för ombud och paketboxar nära kundens postnummer.
- **Transit Time v1** för beräknad leveranstid (`/transittime/addresstoaddress` och `/transittime/addresstolocation`).

Koden skrevs först av AI utifrån antaganden om API:erna. Sedan jämfördes den med PostNords dokumentation och med riktiga svar från sandlådan, och rättades. Hela förloppet finns i [ai-logg-labb5.md](ai-logg-labb5.md).

## Hur vi verifierade

- **Sandlåda:** riktiga anrop mot `atapi2.postnord.com` med egen nyckel. Svaren är PostNords testdata och kan skilja sig från produktion.
- **Mock:** automatiska tester (`npm test`) med en låtsad `fetch`. Svaren är kopierade från sandlådan, eller konstruerade för fel som inte går att framkalla hos PostNord, som timeout och 502.

Kolumnen "Verifierat" i tabellerna säger vilket av dem som gäller.

## Ombud och paketboxar (Service Points V5)

| Antagande | Vad som visade sig | Anpassning | Verifierat |
|---|---|---|---|
| Svaret har `servicePointInformationResponse.servicePoints` med id, namn, besöksadress och avstånd | Stämde | Zod i två nivåer: hela svaret, sedan varje plats | Sandlåda |
| Sökningen ger bemannade ombud | Fyra av fem träffar var paketboxar. Dokumentationen rekommenderar att de hämtas var för sig med `typeId` | Två anrop: `typeId=24,25,54` för ombud och `typeId=2` för paketboxar | Sandlåda |
| Dokumentationens lista med ombudstyper (4, 6, 24, 25, 37, 38, 44, 46, 54, 61) fungerar | 400: "Invalid typeId: 4 for countryCode: SE". Listan blandar länder | Bara de svenska typerna 24, 25 och 54 | Sandlåda |
| Nyckeln kan skickas i ett huvud | Huvudet `apikey` fungerar, men dokumentationen anger parametern `apikey` i adressen | Följer dokumentationen. Nyckeln maskeras i alla meddelanden och loggar | Sandlåda |
| `northing` är longitud och `easting` latitud, som dokumentationen säger | I svaren är `northing` 56,7 för Kalmar, alltså latituden | Följer svaren, med en kommentar i koden | Sandlåda |
| Ett ogiltigt postnummer ger ett strukturerat fel | 400 med `API-400` och texten "Postalcode not found", utan uppgift om parametern | Klassas som ogiltigt postnummer på den texten (trimmad, utan hänsyn till versaler) | Sandlåda |
| Små formatfrågor | Postnumret ska skickas utan mellanslag. Orten kommer med versaler. Ett ombuds id är bara unikt tillsammans med landskoden | Mellanslag tas bort, "KALMAR" blir "Kalmar", landskoden ska sparas på ordern | Sandlåda |

## Leveranstid (Transit Time)

| Antagande | Vad som visade sig | Anpassning | Verifierat |
|---|---|---|---|
| AI:ns första version: `/rest/transport/v1/transittime/getTransitTimeInformation.json` med `serviceCode` och `dateOfDeparture` | 502 Bad Gateway. Dokumentationen anger `/transittime/addresstoaddress` med `serviceCodes`, `serviceGroup` och `startTime` | Bytt till de dokumenterade endpointsen och parametrarna | Sandlåda |
| Dokumentationen gäller den version som finns | Versionen står inte. `v1` och `v2` finns båda, men `v2` kräver `destinationProductionPointId` i stället för `destinationLocationId` | `v1`, som dokumentationen beskriver | Sandlåda |
| Exemplet för Address to Location stämmer | Exemplet pekar på `/addresstoaddress`. Den riktiga endpointen är `/addresstolocation` | `/addresstolocation` för valt ombud eller paketbox | Sandlåda |
| Svaret är ett objekt med en leveranstid | Dokumentationen har inget exempel. Svaret är en lista med en rad per variant: grundtjänsten och varianter med tillägg | Grundtjänsten väljs: rätt `serviceCode`, inga tillägg, tidigast `timeOfArrival` | Sandlåda |
| Ett fel ger en felkod | Ett ogiltigt ombuds-id ger 200 OK med en rad med `errorMessage`. Att kontrollera `response.ok` räcker inte | Varje rad kontrolleras mot ett schema för lyckad rad och ett för felrad | Sandlåda |
| `isBookable` och `isSupported` behövs | Odokumenterade. I `v1` finns de bara på felrader och är då alltid `false` | Används inte | Sandlåda |
| Ett tillägg som inte erbjuds ger en felrad | Varianten försvinner tyst ur listan | `notSupported` bara när grundtjänsten saknas | Sandlåda |
| Gata och gatunummer krävs, som dokumentationen säger | Svaret blir detsamma med bara postnumret | Bara postnummer skickas. Ingen adresstolkning | Sandlåda |
| Ogiltigt postnummer | 400 med `API-009` och `paramValues` som pekar ut `destinationPostCode` | Klassas på de strukturerade fälten | Sandlåda |
| Ogiltigt ombuds-id | 200 med raden "Requested destination location '999999999-SERVICE_POINT-SE' not found." Ingen felkod på raden | Klassas som ogiltigt ombud bara på den texten och med rätt id. Andra felrader ger `notSupported` | Sandlåda (ogiltigt id), Mock (andra felrader) |
| Ombudets id i adressen är `servicePointId` | Stämde. PostNords andra id, `pudoId`, ger "not found" | `servicePointId` | Sandlåda |
| `startTime` kan vara tidpunkten för beställningen | `startTime` är när PostNord får paketet | `nextHandoverTime`: före kl. 12 på vardagar samma dag kl. 14, annars nästa vardag. Egna antaganden. Sista bokningstid i sandlådan var 14.00 | Mock (tidsberäkningen), Sandlåda (ett anrop) |

## Felhantering och säkerhet

- Adaptern har en egen hjälpfunktion för PostNord, med timeout på 5 sekunder och utan omförsök. Den läser felsvarets innehåll, där PostNord förklarar felet. Den gemensamma `fetchJson.ts` är oförändrad.
- Leveranstiden har sju utfall och ombudssökningen sex, så att ett ogiltigt postnummer, ett avvisat anrop, ett driftstopp och ett oväntat svar går att skilja åt i loggen. Kunden ser butikens egna texter, aldrig PostNords felmeddelanden.
- Om ena gruppen (ombud eller paketboxar) inte svarar visas den andra ändå.
- Nyckeln ligger i adressen enligt dokumentationen. Därför maskeras den i alla skäl och loggar, och adressen skrivs aldrig ut.
- `.env` och `.env.postnord` är blockerade för AI-verktyget. Testskripten laddar bara `.env.postnord`, som innehåller PostNords två variabler.

## Hur testerna hjälpte

Testerna skrevs innan de sista bristerna rättades:

1. **Första körningen: 9 av 56 fallerade.** En bruten anslutning medan svaret lästes blev "oväntat svar" i stället för "PostNord svarar inte". Ogiltiga tider som "2026-02-30T18:00:00" blev leveranstider. Alla felrader från `/addresstolocation` blev "ogiltigt ombud".
2. **Andra körningen: 2 av 56 fallerade.** Rättningen av tidskontrollen kastade ett fel för text som inte alls liknade en tid, i stället för att svara nej.
3. **Tredje körningen: 56 av 56 godkända.**

De mockade testerna täcker fel som inte går att framkalla hos PostNord: timeout, 502, 503, 429, avbruten anslutning, svar som inte är JSON, extra fält och fält med fel typ. De kontrollerar också att nyckeln aldrig syns, inte ens när ett felsvar innehåller den.

## Verifierat mot sandlådan eller bara med mock

**Mot sandlådan:**

- Ombudssökning för 393 65: fem ombud och fem paketboxar, med koordinater, öppettider och krav för paketboxarna.
- Postnummer 00000 i båda API:erna.
- Leveranstid för hemleverans, ombud utan valt ombud, valt ombud och vald paketbox.
- Ogiltigt ombuds-id.
- Felaktiga `typeId`, nyckeln i huvud och i adress, och skillnaden mellan `v1` och `v2`.

**Bara med mock:**

- Timeout, 5xx, 429 och avbruten anslutning.
- Partiella resultat, där ena gruppen inte svarar.
- Två tomma listor (`noServicePoints`).
- Svar som inte är JSON, extra fält och fält med fel typ.
- Andra felrader från `/addresstolocation`, och felrader från `/addresstoaddress`. Sådana rader har vi bara sett i `v2`.
- Nyckeln i ett felsvar.
- Överlämningstiden vid helger och vid bytet mellan sommar- och vintertid.

## Begränsningar som finns kvar

- Svenska helgdagar hanteras inte i överlämningstiden.
- Två klassificeringar bygger på PostNords feltext, eftersom strukturerade fält saknas: ogiltigt postnummer i ombudssökningen och ogiltigt ombuds-id i leveranstiden. Ändras texten blir utfallet ett avvisat anrop eller en tjänst som inte stöds, och kunden kan fortfarande köpa.
- Tidsformatet är strikt. Skickar PostNord tidszon eller millisekunder visas ingen leveranstid förrän adaptern har anpassats.
- Leveranstiden bygger på butikens antagna överlämning kl. 14, inte på en bokad upphämtning.
- Bara frakt inom Sverige.
- Testerna körs lokalt med `npm test`, inte vid deploy.
