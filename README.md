# Vikingsås

E-handel med tio chilisåser i stigande styrka, från en mild jalapeño till Pepper X. Byggd som skoluppgift i kursen Systemutveckling på Medieinstitutet.

Vidareutvecklad i kursen Integration med 3-partssystem.

Sajten ligger på https://chili-ehandel.vercel.app

![Startsidan på Vikingsås](docs/screenshots/hero.webp)

## Om uppgiften

Uppgiften hette "Min egna e-handel" och gick ut på att bygga en butik som fungerar för både kunder och administratörer. Admin lägger till och redigerar produkter som sparas i databasen. Kunden ser produkterna, lägger dem i en varukorg, "betalar" och skapar en order som admin sedan kan se. Betalningen är bara ett formulär med namn och e-post, ingen riktig betallösning. Sidan skulle också vara deployad så att andra kan se den.

Innan bygget skulle tidsplan, sitemap och ER-diagram tas fram. De ligger i [docs/](docs/).

För VG skulle dessutom:

- varukorgen sparas i databasen istället för bara i React
- det finnas inloggning så att bara administratörer kan redigera produkter
- admin kunna sätta orderstatus: Beställd, Behandlas, Levererad, Återbetald

Alla krav för både G och VG är uppfyllda.

## Produkterna

Varje sås har en egen sektion på startsidan med styrka, pris och en utfällbar ruta för näringsvärde och ingredienser. Glöden bakom flaskan och knappen har samma färg som etiketten.

<p>
  <img src="docs/screenshots/produkt-1.webp" alt="Jalapeño, styrka 1" width="49%">
  <img src="docs/screenshots/produkt-2.webp" alt="Mango, styrka 2" width="49%">
  <img src="docs/screenshots/produkt-3.webp" alt="Chipotle, styrka 3" width="49%">
  <img src="docs/screenshots/produkt-4.webp" alt="Cayenne, styrka 4" width="49%">
  <img src="docs/screenshots/produkt-5.webp" alt="Habanero, styrka 5" width="49%">
  <img src="docs/screenshots/produkt-6.webp" alt="Scotch Bonnet, styrka 6" width="49%">
  <img src="docs/screenshots/produkt-7.webp" alt="Ghost Pepper, styrka 7" width="49%">
  <img src="docs/screenshots/produkt-8.webp" alt="Carolina Reaper, styrka 8" width="49%">
  <img src="docs/screenshots/produkt-9.webp" alt="7-Pot Douglah, styrka 9" width="49%">
  <img src="docs/screenshots/produkt-10.webp" alt="Pepper X, styrka 10" width="49%">
</p>

## Funktioner

### Kund

- mina tio egna såser på startsidan
- alla produkter med sökning och bläddring på `/produkter`
- priser i SEK, EUR, NOK eller DKK
- varukorg som sparas i databasen och kopplas till besökaren med en cookie, kunder behöver inte logga in
- kassa med namn, e-post, telefon och adress, och kortbetalning med Stripe
- frakt med PostNord: ombud, paketbox eller hemleverans, beräknad leverans och fri frakt över en gräns
- tacksida som visar ordern, frakten och om betalningen har gått igenom

### Admin

- inloggning med express-session, sessionerna sparas i Postgres och lösenorden hashas med bcrypt
- skapa och redigera produkter, och slå av eller på dem med en switch
- importera leverantörens produkter som CSV eller XML
- lista med alla ordrar och en detaljsida per order, med betalstatus och frakt
- ändra orderstatus
- välja ombud i efterhand för ordrar där PostNord inte svarade
- ändra fraktpriser och gränser för fri frakt

Adminpanelen länkas inte från butiken, den nås på `/admin/logga-in`.

## Tekniker

- React, Vite och React Router
- Express 5 och TypeScript
- PostgreSQL hos Supabase, egen SQL via `pg`
- express-session med connect-pg-simple, bcryptjs
- Zod för att validera data från andra system och från webbläsaren
- Algolia för sökningen, Stripe för betalningen, Frankfurter för valutakurserna, PostNord för frakten
- Nodes inbyggda testkörare via tsx
- Vercel

## Vad jag övade på

- rita ett ER-diagram och bygga tabellerna efter det
- spara produktnamn och pris på orderraden, så att en gammal order inte ändras när admin ändrar priset
- transaktioner, en order och dess rader sparas allt eller inget
- `json_agg` för att hämta en order med alla rader i en och samma fråga
- sessionsbaserad inloggning och middleware som skyddar admin-routes
- React Context för antalet i varukorgen
- deploy med Vercel CLI

## Integrationer

I kursen Integration med 3e partssystem byggde jag vidare på samma butik och kopplade ihop den med externa tjänster. Alla anrop går via Express, varje tjänst har en egen adapter i `server/integrations/` och nycklarna ligger i `.env`.

### Import från leverantören

Admin kan hämta leverantörens produktkatalog som CSV eller XML, med en knapp per format på produktsidan i admin. Varje rad valideras med Zod innan den sparas, och efteråt visas en rapport med nya, uppdaterade och överhoppade produkter. Importen gör upsert på artikelnumret, så en andra import skapar inga dubbletter.

Så här gjorde jag med fälten:

- **Artikelnummer** sparas i en ny kolumn i databasen, `sku` som är unik. Det är den importen använder för att avgöra om produkten redan finns, och den blir `objectID` i Algolia. Mina egna tio såser fick VS-001 till VS-010.
- **EAN** sparas som text, inte tal annars försvinner nollan i början.
- **Kategori** sparas i `category` i products så att den kan användas som filter i sökningen. Den borde nog läggas som egen tabell så att samma kategori inte kan stavas på flera sätt (single source of truth).
- **Pris** har decimalkomma i CSV-filen och decimalpunkt i XML-filen, båda blir samma tal. En produkt utan pris hoppas över (LEV-1037 har "ej satt") och orsaken står i rapporten.
- **Lagersaldo** som saknas blir `null`, alltså okänt. 0 betyder att varan är slut, och det vet jag inte.
- **Varianter** sparas som en lista (`TEXT[]`). Där står storleken, till exempel 150 ml och 250 ml.
- **Uppdaterad** tar jag inte med, butiken har ingen användning för datumet.
- **Volym och styrka** finns inte hos leverantören. Jag gjorde kolumnerna frivilliga hellre än att gissa ett värde. Men det är en svaghet. Jag får anställa ett team som bedömer styrkan i varje produkt innan de listas i butiken.

En ny import skriver bara över leverantörens fält. Det admin har fyllt i själv, som beskrivning, bild och styrka, ligger kvar.

### Sökning med Algolia

Designen på e-handeln var från början tänkt att bara rymma tio produkter (Vikingsås är ett litet lokalt bolag). För att få plats med fler produkter gjorde jag om förstasidan till en slags "spotlight" och skapade en separat produktsida, `/produkter`, med ett rutnät som rymmer alla nya produkter utan att användaren behöver scrolla flera kilometer. Då föll det sig naturligt att ha sökrutan där. Startsidan hämtar från databasen och inte från Algolia, så butiken fungerar även om sökningen ligger nere.

- React anropar bara mitt eget `GET /api/search`. Express frågar Algolia via `server/integrations/searchAdapter.ts` och svarar i butikens format, `{ products, meta: { page, pageSize, total, totalPages } }`, inte med Algolias råa svar.
- Ingen Algolia-nyckel finns i webbläsaren. Skrivnyckeln och söknyckeln ligger båda på servern.
- Artikelnumret (`sku`) är `objectID`, så en ändrad produkt uppdateras i stället för att dyka upp två gånger.
- Databasen först, sedan Algolia. När admin skapar, ändrar eller stänger av en produkt, eller kör en import, sparas den först i databasen. Svarar inte Algolia är produkten ändå sparad, och admin får en varning om att sökindexet inte är uppdaterat. En avstängd produkt tas bort ur sökningen.
- Parametrarna valideras med Zod. Sidorna räknas från 1 hos mig och från 0 hos Algolia. 12 produkter per sida som standard, max 50. `?page=0` och `?pageSize=1000` ger 400 med ett begripligt fel.
- Söktext och sida står i adressen (`/produkter?q=habanero&page=2`), så bakåtknappen, omladdning och länkar fungerar.
- Sökningen körs medan man skriver, rent krasst för användarupplevelsen. Den väntar tills man har pausat i 300 ms (debounce), annars blir det ett anrop per tangent och Algolias gratisnivå har ett tak.

### Betalning med Stripe

Kunden betalar med Stripe Checkout i testläge. Jag valde embedded, där Stripes formulär ligger inne i kassan, i stället för hosted där kunden skickas till Stripes egen sida. Jag tänkte att det skulle ge mer förtroende när kunden stannar i butiken hela vägen. Nu när jag sett hur formuläret beter sig är jag mer osäker. Det går bara att styla med färger, typsnitt och hörn (`branding_settings`), så det ser ut som Stripe och inte som Vikingsås. Vill jag ha full kontroll är nästa steg Stripe Elements, där jag bygger formuläret själv av Stripes fält.

Så går ett köp till:

1. Kunden fyller i namn, e-post, telefon och adress. React skickar bara de uppgifterna till `POST /api/orders`, inga produkter och inga priser. Varukorgen finns redan i databasen.
2. Servern läser varukorgen och priserna ur databasen och kontrollerar lagersaldot. Ordern och raderna sparas som Obetald i en transaktion.
3. Först därefter skapar servern en Checkout Session hos Stripe, med orderns id som `client_reference_id`. Kassan får tillbaka en `clientSecret` och visar Stripes formulär.
4. Kunden betalar och skickas till `/tack?session_id=...`.
5. Stripe skickar en webhook till `POST /api/stripe/webhook`. Servern verifierar signaturen och sätter ordern som Betald, minskar lagersaldot och tömmer varukorgen, allt i en transaktion.

Tacksidan visar bara status. Den hämtar ordern med sessionens id och frågar igen varannan sekund så länge ordern är Obetald, eftersom kunden och webhooken kommer tillbaka ungefär samtidigt. Varken tacksidan eller något annat i React kan sätta ordern som betald, det gör bara webhooken. Sessionens id används i stället för orderns, eftersom order-id går att gissa (1, 2, 3).

Val jag har gjort:

- Betalningen har en egen kolumn, `payment_status` (Obetald, Betald, Avbruten). Den gamla `status` handlar om leveransen och fick vara kvar.
- Webhooken ligger före `express.json()` i `app.ts` och läser bodyn med `express.raw`. Signaturen räknas på exakt de bytes Stripe skickade, och görs de om till JSON först stämmer den inte. Fel signatur ger 400 och ingen order ändras.
- Samma händelse kan komma flera gånger. Ordern blir bara Betald om den är Obetald (`WHERE payment_status = 'Obetald'`), så andra gången ändras inga rader och lagret minskas inte igen.
- Varukorgen töms först när betalningen är klar. Avbryter kunden finns varorna kvar.
- Tomt lagersaldo räknas som slut i lager. Det är ett medvetet val. Tomt betyder att vi inte vet, och då finns det inget saldo att dra vid köp. En kund skulle kunna beställa 1000 chilisåser som vi inte har i lager.
- Sessionen löper ut efter 30 minuter (`expires_at`), annars väntar Stripe i 24 timmar. Då skickar Stripe `checkout.session.expired` och ordern blir Avbruten. En betald order ändras aldrig.
- Stripe räknar i öre, `Math.round(pris * 100)`. Utan `Math.round` kan 49,90 bli 4989,999... i JavaScript.
- Stripes egen timeout är 80 sekunder, alldeles för länge för en kund som väntar. Min väntar max 10 sekunder, sedan får kunden ett begripligt fel och ordern förblir Obetald.
- Kassan tar fullständig adress i egna kolumner (`shipping_street`, `shipping_postal_code`, `shipping_city`). Det kommer hjälpa senare när frakten ska in, transportbolagets API vill ha varje del för sig.
- Egen validering med en röd rad under fältet i stället för webbläsarens varningar. Servern kollar samma sak med Zod, eftersom det går att runda webbläsaren.
- Den hemliga nyckeln finns bara på servern. React får bara den publika, `VITE_STRIPE_PUBLISHABLE_KEY`. Den byggs in i JavaScript-filen som alla besökare laddar ner, så på Vercel ligger den som Config och inte som Secret.

### Frakt med PostNord

I kassan väljer kunden ombud eller paketbox, eller hemleverans. När postnumret är ifyllt visas fraktalternativen med pris och beräknad leverans. Väljer kunden ombud visas de fem närmaste ombuden och de fem närmaste paketboxarna, och för det valda ombudet öppettider och en länk till kartan. Labben gjordes med AI, se nästa avsnitt.

Så går det till:

1. Kassan frågar `GET /api/shipping/options?postalCode=...` först när postnumret är fem siffror, inte vid varje tangenttryckning. Samma postnummer frågas bara en gång.
2. Servern hämtar fraktpriserna ur databasen, räknar priset på varukorgen i databasen och frågar PostNord om ombud och leveranstid. Kassan får butikens format, aldrig PostNords svar.
3. Väljer kunden ett ombud hämtas leveranstiden till just det ombudet.
4. Vid beställningen skickar React bara fraktsättet och ombudets id, aldrig ett pris. Servern kontrollerar att ombudet finns för postnumret, räknar priset igen och sparar fraktsätt, pris och ombud på ordern.
5. Frakten blir en egen rad i Stripe. Ordern och Stripe får samma rader, så `total_amount` är alltid samma belopp som kunden betalar.

Val jag har gjort:

- **En adapter som går att byta.** `server/integrations/shippingCarrier.ts` beskriver vad ett transportbolag ska kunna: hitta ombud och räkna fram leveranstid. `postnordAdapter.ts` är den enda filen som vet hur PostNord fungerar. Vill jag byta bolag skriver jag en ny adapter och ändrar en rad.
- **Fraktpriserna ligger i databasen**, i tabellen `shipping_methods`, så att de kan ändras i admin under Frakt utan ny deploy. Ordern sparar en kopia av namnet och priset, samma princip som orderraderna, så en gammal order visar det kunden faktiskt betalade.
- **Priser och gränser för fri frakt.** Ombud kostar 69 kr med fri frakt från 399 kr, hemleverans 139 kr med fri frakt från 499 kr. Jag simulerade varukorgar utifrån butikens priser och jämförde med PostNords prislista. Vid 399 kr ligger fler kunder precis under gränsen än över den, så en sås till ger fri frakt. 69 kr är mindre än en typisk sås men mer än de billigaste produkterna, så nära gränsen är det billigare att lägga till chiliflakes än att betala frakten. Hemleverans kostar PostNord mer, därför ligger både pris och gräns högre.
- **Paketboxar finns med**, i en egen grupp. PostNord rekommenderar att ombud och paketboxar hämtas var för sig.
- **Bara inom Sverige.** Valutaväljaren räknar om priserna, men kunden betalar i kronor, och kassan och varukorgen säger att vi bara skickar inom Sverige.
- **Kunden kan handla även om PostNord inte svarar.** Ordern får ombudsstatus Väntar, och kassan säger att vi väljer ett ombud nära kundens adress. I admin markeras betalda ordrar som saknar ombud, och där kan jag hämta ombud från PostNord och spara ett i efterhand. Villkoren står i samma `UPDATE` som sparar valet, så två administratörer kan inte skriva över varandra.
- **Ett tekniskt fel är inte samma sak som ett nej.** Säger PostNord att det inte finns några ombud går ombud inte att välja, kunden får hemleverans. Säger PostNord att postnumret inte finns visas ett fel under postnummerfältet. Avvisar PostNord anropet loggas det som ett integrationsfel, inte som att PostNord ligger nere.
- **Leveranstiden är en uppskattning.** Den räknas från när paketet lämnas till PostNord, inte från när kunden beställer: före kl. 12 på vardagar samma dag kl. 14, annars nästa vardag. Det är mina egna antaganden, och helgdagar hanteras inte än. Går leveranstiden inte att hämta står det "Beräknad leveranstid är tillfälligt otillgänglig.", och det stoppar aldrig ett köp.
- **Tacksidan visar bara ordern för den som lade den.** Utöver Stripes sessions-id måste ordern höra till varukorgen i besökarens kaka, eftersom id:t står i adressen och kan hamna i historiken.
- **Nyckeln skickas i adressen**, eftersom PostNords dokumentation säger så. Därför skrivs adressen aldrig i något felmeddelande, och nyckeln maskeras i allt som loggas.

### Så använde jag AI i labb 5

Labb 5 var en AI-labb. AI skrev koden, och jag kontrollerade den mot PostNords dokumentation och sandlåda. Jag använde Claude Code i VS Code, som kan läsa projektet. För att kontrollera Claude lät jag ChatGPT granska planen och koden, och tog med dess synpunkter som nya krav. Hela konversationen finns i [docs/ai-logg-labb5.md](docs/ai-logg-labb5.md), och skillnaderna mot PostNords dokumentation i [docs/postnord-avvikelser.md](docs/postnord-avvikelser.md).

**Nycklarna.** `.env` är blockerad för Claude i `.claude/settings.json`, och jag godkände varje filändring och varje terminalkommando innan det kördes. Testskripten mot sandlådan laddade bara `.env.postnord`, en egen fil med PostNords två variabler. Nyckeln har aldrig klistrats in i en chatt.

**Prompterna i korthet**, ordagrant i loggen:

- Läs labben i kursrepot, sammanfatta den och gör en gemensam plan. Adaptern ska göra det enkelt att byta transportbolag.
- Fraktpriserna ska ligga i databasen, och gamla ordrar ska behålla sitt fraktpris.
- Räkna fram gränserna för fri frakt utifrån butikens priser och PostNords priser, så att kunden oftast hamnar precis under gränsen.
- Om PostNord inte svarar ska ordern skapas och ombudet väljas i efterhand i admin.
- Jag vill ha med paketboxar.
- Kontrollera mot den dokumenterade endpointen, gör inga antaganden om svarets struktur och ändra ingen kod förrän du visat vad som behöver ändras.
- Granskningen från ChatGPT: skilj på olika sorters fel, räkna `startTime` från när paketet lämnas, håll leveranstid och ombudssökning oberoende, och testa med mockad `fetch`.

**Vad AI:n föreslog, och vad som skilde sig**

- Claudes första version av leveranstiden använde `/rest/transport/v1/transittime/getTransitTimeInformation.json`. Den gav 502. Dokumentationen anger `/transittime/addresstoaddress` och `/transittime/addresstolocation`, med andra parametrar.
- Svaret antogs vara ett objekt. Det är en lista med en rad per variant av tjänsten, och fel kommer som rader i ett svar med 200 OK. Att kontrollera `response.ok` räcker alltså inte.
- `startTime` sattes först till när kunden beställer. Det är när PostNord får paketet, så nu räknas den fram från bryttid och överlämningstid.
- Ombudssökningen antogs ge bemannade ombud. Fyra av fem var paketboxar.
- Claude flyttade nyckeln från adressen till ett huvud efter ett test. Det fungerade, men det står inte i dokumentationen, så den flyttades tillbaka och maskeras i stället.
- PostNords dokumentation hade egna fel: listan med ombudstyper ger 400 för Sverige, latitud och longitud har bytt plats, exemplet för Address to Location pekar på fel endpoint, versionen står inte, gata och nummer står som obligatoriska men behövs inte, och exempel på svar saknas.

**Hur det kontrollerades och löstes**

- Varje antagande prövades mot sandlådan med skript utanför repot, och de riktiga svaren jämfördes med dokumentationen innan Zod-schemana skrevs.
- Testerna skrevs innan de sista bristerna rättades. Första körningen gav 9 fel av 56: en bruten anslutning blev "oväntat svar", omöjliga datum som 30 februari blev leveranstider, och alla fel från `/addresstolocation` blev "ogiltigt ombud". Rättningen av datumen gav två nya fel, som också rättades. I dag finns 111 tester och alla går igenom.
- I produktion visade kassan först inga ombud. Loggen sa "Integrationsfel mot PostNord", och det visade sig att ett tecken saknades i nyckeln på Vercel. Kunden kunde ändå handla under tiden.

## Kom igång

Den deployade butiken ligger på https://chili-ehandel.vercel.app

### Konton

Alla är gratis, och bara testlägen används:

- **Supabase** för databasen (Postgres)
- **Algolia** för sökningen
- **Stripe** i testläge, och [Stripe CLI](https://docs.stripe.com/stripe-cli) för att ta emot webhooks lokalt
- **PostNord** för ombud och leveranstid. Skapa ett konto på [atdeveloper.postnord.com](https://atdeveloper.postnord.com), välj Customer plan och skapa en nyckel för sandlådan

Leverantörens API och Frankfurter behöver inga egna konton.

### Starta lokalt

Installera beroenden:

```
npm install
```

Kopiera `.env.example` till `.env` och fyll i värdena. Där står varje variabel och var den hittas.

Kör `db/schema.sql` och sedan `db/seed.sql` i Supabase SQL editor. Finns databasen redan körs i stället de filer i `db/migrations/` som inte är körda, se Databas. Skapa ett adminkonto:

```
npx tsx --env-file=.env create-admin.ts <e-post> <lösenord>
```

Starta sedan två terminaler, en för frontend och en för API:et:

```
npm run dev
npm run dev:api
```

Frontend hamnar på http://localhost:5173 och API:et på http://localhost:3000. Vite skickar vidare allt som börjar med `/api` till Express, så webbläsaren ser bara en adress och jag slipper CORS. Hamnar Vite på en annan port måste `CLIENT_URL` i `.env` ändras till samma, annars skickas kunden till fel adress efter betalningen.

### Testa integrationerna lokalt

**Import.** Logga in i admin och klicka på CSV eller XML på produktsidan.

**Sökning.** Första gången behöver alla produkter skickas till Algolia. Logga in i admin, öppna webbläsarens konsol och kör:

```
fetch('/api/admin/search/index', { method: 'POST' })
```

Efter det håller admin och importen sökindexet uppdaterat.

**Betalning.** Stripe kan inte nå localhost, så webhooken tas emot med Stripe CLI i en tredje terminal:

```
stripe login
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.expired --forward-to localhost:3000/api/stripe/webhook
```

`stripe listen` skriver ut en `whsec_...`. Lägg den i `.env` som `STRIPE_WEBHOOK_SECRET` och starta om `npm run dev:api`.

Betala med testkortet `4242 4242 4242 4242`, ett framtida datum och valfri CVC. För att testa en utgången session utan att vänta 30 minuter:

```
stripe checkout sessions expire <cs_test_...>
```

Sessionens id står i kolumnen `stripe_session_id` i `orders`.

**Frakt.** Lägg något i varukorgen, gå till kassan och skriv ett postnummer, till exempel 393 65. Sandlådan ger ombud och leveranstider med PostNords testdata. 00000 ger felet för ett postnummer som inte finns. Fraktpriserna ändras i admin under Frakt.

**Tester.** `npm test` kör testerna för frakten. De använder låtsade svar från PostNord, så de behöver ingen `.env` och anropar aldrig PostNord.

## Kommandon

| Kommando            | Gör                                                     |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | startar frontend                                        |
| `npm run dev:api`   | startar API:et, läser `.env` och startar om vid ändring |
| `npm run build`     | typkontroll med `tsc -b`, sedan bygger frontend         |
| `npm run preview`   | visar det byggda resultatet lokalt                      |
| `npm run lint`      | kör oxlint                                              |
| `npm test`          | kör testerna, utan nycklar och utan anrop till PostNord |
| `npx vercel --prod` | deployar till produktion                                |

## Databas

SQL:en körs manuellt i Supabase SQL editor, det finns ingen automatisk migrering.

- `db/schema.sql` skapar tabellerna i en ny, tom databas
- `db/seed.sql` lägger in de tio produkterna och de två fraktsätten. Körs bara en gång, `title` är inte unik så en andra körning ger dubbletter
- `db/migrations/` innehåller ändringar som körs en gång mot en databas som redan finns, en fil per ändring med datum i namnet. Samma ändringar står också sist i `db/schema.sql`

Supabase-projektet får inte pausas, då slutar den deployade butiken visa produkter.

## Deploy

Vercel är inte kopplat till GitHub eftersom projektet ligger på Medieinstitutets konto, CLI:n laddar upp filerna som ligger på disk. Därför gäller ordningen:

```
git commit -am "..."
git push
npx vercel --prod
```

Hoppa inte över push, annars börjar produktionen och repot skilja sig åt.

Kontrollera efteråt att API och databas svarar, https://chili-ehandel.vercel.app/api/health ska ge `"status":"ok"` och antalet produkter:

```
{"status":"ok","products":55}
```

Nycklarna ligger som miljövariabler på Vercel, samma namn som i `.env.example`. Tre skillnader mot lokalt:

- `CLIENT_URL` är `https://chili-ehandel.vercel.app`
- `VITE_STRIPE_PUBLISHABLE_KEY` måste finnas innan deployen, Vite bygger in den i frontend
- `STRIPE_WEBHOOK_SECRET` kommer från webhook-endpointen i Stripe Dashboard, inte från `stripe listen`. Endpointen pekar på `https://chili-ehandel.vercel.app/api/stripe/webhook` och lyssnar på samma tre händelser som i Kom igång.

För frakten behövs `POSTNORD_API_URL` och `POSTNORD_API_KEY`. `SHOP_POSTAL_CODE`, `SHIPPING_CUTOFF_HOUR` och `SHIPPING_HANDOVER_HOUR` kan utelämnas, då gäller 39365, 12 och 14. En ändrad variabel gäller först efter nästa deploy.

Vercel kör `vite build` i molnet, inte `npm run build`. Typkontrollen sker alltså bara lokalt, körs innan deploy.

## Om något strular

**`Error: Not authorized` vid deploy.** Inloggningen är borta. Kör `npx vercel login`, välj GitHub, kontrollera sedan med `npx vercel whoami`.

**npx vill installera `vercel` igen.** Normalt, inget fel. npx cachar paketet och hämtar senaste versionen när cachen är tom.

**Produkterna syns inte på sajten.** Kolla `/api/health` först. Svarar den med ett felmeddelande ligger problemet i databasen, inte i frontend.

**`stripe` känns inte igen i VS Code-terminalen.** VS Code har kvar sökvägarna från innan Stripe CLI installerades. Starta om VS Code, eller läs in dem på nytt i PowerShell:

```
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
```

**`stripe listen` säger "must specify events".** Händelserna måste anges med `--events`, se Kom igång.

**Tacksidan står kvar på "Väntar på betalningen".** Webhooken kommer inte fram. Lokalt: kolla att `stripe listen` är igång och att `STRIPE_WEBHOOK_SECRET` är den den skrev ut. I produktion: öppna webhook-endpointen i Stripe Dashboard, där syns varje försök och vad servern svarade.

**Tacksidan kan inte nås efter betalningen lokalt.** Stripe skickar kunden till `CLIENT_URL`. Startade Vite på en annan port än den som står där hamnar kunden fel.

**Kassan visar inga ombud, eller säger att leveransalternativet inte kunde kontrolleras.** Sök på "Integrationsfel mot PostNord" eller "PostNord svarar inte" i loggen på Vercel. Raden visar vad PostNord svarade, och nyckeln är maskerad. Hos mig saknades ett tecken i `POSTNORD_API_KEY` på Vercel.

## Dokumentation

Tidsplan, sitemap och ER-diagram ligger i [docs/](docs/). Där finns också [loggen över hur jag använde AI i labb 5](docs/ai-logg-labb5.md) och [skillnaderna mot PostNords dokumentation](docs/postnord-avvikelser.md).
