# AI-logg, labb 5 (frakt med PostNord)

Verktyg: Claude Code i VS Code (agent som kan läsa projektet). Modell: Claude Opus 5.5.
`.env` får inte läsas av verktyget, och API-nyckeln klistras aldrig in i chatten.

---

## Prompt 1 (30 okt 2026)

> Jag har fått en labb i uppgift av min lärare (labb 5), den går ut på att integrera postnord med min befintliga e-handelslösning. Vi ska använda en adapter så att jag enkelt kan byta transportbolag om jag vill. Validering ska ske med Zod och projektet skrivs i TypeScript. En klon av lärarens repo med instruktioner finns här: D:\Fullstack developer\7 Integration med 3e partssystem\integration-with-external-systems-fsu25
>
> Den är uppdaterad. Jag vill att du börjar med att läsa igenom uppgiften och summera den i punktform till mig. Därefter sätter vi en gemensam plan för genomförandet. Du ska under varje steg dokumentera mina promptar till dig och dina svar till mig. Det är en del av inlämningen. Denna prompten är den första.

### Svar

Jag har läst labbens PDF, de gemensamma kraven i inlämningsuppgift 1 och README:n för lektion 7 i kursrepot.

**Det som ska byggas**

- Ett gratis konto på PostNords utvecklarportal (atdeveloper.postnord.com) med Customer plan, och en API-nyckel för sandlådan. Nyckeln finns bara på servern.
- **Ombud:** kunden skriver sitt postnummer och ser de närmaste ombuden från PostNord, via din server. Kunden väljer ett, och servern kontrollerar att det valda ombudet verkligen finns bland ombuden för postnumret.
- **Leveranstid:** kassan visar beräknad leverans från PostNords API, från butikens postnummer till kundens, till exempel "Beräknad leverans: tisdag 27/10".
- **Fraktpriser:** kommer från butikens egen prislista, eftersom PostNord inte har något pris-API för Sverige. Två alternativ, ombud och hemleverans, med ett fast pris var (till exempel 59 kr och 99 kr). Fri frakt när ordervärdet når en gräns du väljer (till exempel 500 kr).
- Fraktpriset räknas på servern och visas i kassan innan betalningen. React skickar aldrig ett pris.
- Fraktalternativ, fraktpris och ombud sparas på ordern. Frakten ingår i beloppet i Stripe, till exempel som en egen rad.
- PostNords svar valideras med Zod innan butiken använder det.

**De gemensamma kraven (gäller alla labbar)**

- React pratar bara med din egen Express-server, aldrig direkt med PostNord.
- En adapter per tjänst. Adaptern returnerar butikens format, inte PostNords rådata.
- Nycklar i `.env`, alla variabler i `.env.example` utan riktiga värden, och nycklarna i Vercels miljövariabler i produktion.
- Timeout på varje anrop, och ett begripligt fel om PostNord är nere. Lektionens mål säger också att kunden ska kunna beställa även när PostNord inte svarar.

**Arbetssättet (det som gör det till en AI-labb)**

1. AI:n skriver koden för ombud, leveranstid och fraktpriser.
2. Du testar med din egen sandlådenyckel.
3. Du jämför AI:ns kod med PostNords dokumentation i portalen.
4. Du rättar det som skiljer sig.

Säkerhet: blockera `.env` i AI-verktyget, godkänn varje kommando som agenten vill köra, och klistra aldrig in nyckeln i chatten.

**README**
Ett kort avsnitt om hur AI användes för ombud och leveranstid: vilka prompter du använde, vad AI:n föreslog, vad som skilde sig från PostNords dokumentation (eller hur du kontrollerade att det stämde), och hur du löste det.

**Klart när (i den deployade butiken)**

- Kassan visar fraktpris för ombud och hemleverans, beräknad leverans och ombud nära kundens postnummer.
- Frakten blir 0 kr när ordervärdet når gränsen för fri frakt.
- Valt ombud och fraktpris syns på ordern.
- Beloppet i Stripe är varor plus frakt.
- Ett ombud som inte finns för postnumret avvisas med ett begripligt fel.
- Ingen PostNord-nyckel finns i webbläsaren.
- README beskriver hur AI användes och hur integrationen kontrollerades mot PostNords dokumentation.

**Dina egna krav**

- Adaptern ska byggas så att det är enkelt att byta transportbolag.
- Validering med Zod, allt i TypeScript.
- Varje prompt och mitt svar dokumenteras. Jag sparar dem i `docs/ai-logg-labb5.md`.

**Bra att veta**

- Deadline är söndag 1 november kl. 23:59. Bedömningen görs på den deployade butiken och på koden i senaste commiten före deadline.
- Lärarens genomgång i kursrepot har kod för ombud, men inte för leveranstid eller fraktpris. De delarna ska byggas med AI i labben.

Nästa steg är den gemensamma planen. Säg till om sammanfattningen stämmer med hur du läser uppgiften, så lägger jag fram ett förslag.

---

## Prompt 2 (30 okt 2026)

> Innan vi sätter den gemensamma planen vill jag att du försöker läsa .env-filen i projektets rotmapp. Visa inte innehållet, berätta bara om åtkomsten blockeras.

### Svar

Åtkomsten blockeras. Läsverktyget svarade: "File is in a directory that is denied by your permission settings." Jag har inte sett något av innehållet. Regeln står i `.claude/settings.json` som `deny` på `.env` och `.env.*`.

Jag provade också att läsa `.env.example`, eftersom den behöver ändras när PostNords variabler ska in. Den blockeras också, trots att du har lagt den under `allow`. En deny-regel vinner alltid över en allow-regel, och mönstret `.env.*` fångar även `.env.example`. Om jag ska kunna ändra den behöver `.env.*` bytas mot de filer som har hemligheter, till exempel `.env.local`. Annars skriver du in PostNords rader i `.env.example` själv.

En sak till: regeln gäller mina filverktyg. Ett terminalkommando som `cat .env` stoppas inte säkert av den, så godkänn varje kommando jag vill köra.

---

## Prompt 3 (30 okt 2026)

> Jag har justerat settings.json för dig så nu bör du kunna läsa .env.example men vara stoppad från övriga. Jag har noterat din kommentar om att du kan ta dig förbi med terminalen, jag har ställt in dig på att endast skriva kod med manual som inställning så jag kan granska allt och godkänna det. Gör ett nytt test.

### Svar

Testet gick som du ville:

- `.env` blockeras fortfarande: "File is in a directory that is denied by your permission settings." Inget av innehållet syns.
- `.env.example` går att läsa. Den har variabler för databas, session, valuta, leverantör, Algolia, Stripe och Supabase, men inget för PostNord än. Där lägger vi till PostNords rader längre fram.

Listan nekar nu de vanliga namnen `.env`, `.env.local`, `.env.production`, `.env.development` och `.env.test`, både i roten och i undermappar. En variant som `.env.production.local` täcks inte, men det spelar bara roll om en sådan fil skapas.

Med manuellt godkännande ser du varje filändring och varje kommando innan det körs. Då är vi redo för den gemensamma planen.

---

## Prompt 4 (30 okt 2026)

> Bra, nu tar vi fram planen, jag har skapat ett testkonto hos PostNord och har api nyckeln inlagd i min .env samt uppdaterat .env.example.

### Svar

Jag har läst koden som berörs: `server/routes/orders.ts` (skapar ordern och Stripe-sessionen), `server/integrations/paymentAdapter.ts`, `server/lib/fetchJson.ts` (timeout och omförsök), `src/pages/CheckoutPage.tsx` och tabellen `orders` i `db/schema.sql`. Kassan frågar redan efter adress och postnummer, så frakten har en naturlig plats där. `.env.example` har nu `POSTNORD_API_KEY`.

**Arbetssätt:** jag skriver koden, du granskar och godkänner varje ändring och varje kommando, och du testar i webbläsaren. Steg 2 till 5 följer labbens fyra steg: AI:n skriver, du testar med sandlådenyckeln, vi jämför med PostNords dokumentation och rättar.

**Planförslag**

1. **Gränssnitt för transportbolag.** En TypeScript-typ som beskriver vad ett transportbolag ska ge butiken: närmaste ombud för ett postnummer och beräknad leverans. Routes och kassan känner bara till typen, aldrig PostNord. Byter du bolag skriver du en ny adapter som följer samma typ.
2. **PostNord-adaptern, ombud.** Anrop med timeout, Zod-schema för svaret och omvandling till butikens format. Nyckeln får inte hamna i felmeddelanden eller loggar.
3. **Test med sandlådenyckeln.** Ett anrop mot PostNord som du godkänner, så att vi ser att nyckeln fungerar och vad PostNord svarar.
4. **Jämförelse med dokumentationen.** Vi går igenom adresser, parametrar och fält mot PostNords dokumentation och rättar det som skiljer sig.
5. **Leveranstid.** Samma fyra steg, från butikens postnummer till kundens.
6. **Fraktpriser.** Butikens egen prislista på servern: ombud, hemleverans och gräns för fri frakt. Ingen extern tjänst, alltså ingen adapter.
7. **Route för kassan.** Kassan skickar postnumret och får tillbaka fraktalternativen med pris, beräknad leverans och ombud. Servern räknar priset utifrån varukorgen i databasen.
8. **Databasen.** Nya kolumner på `orders`: fraktalternativ, fraktpris och valt ombud.
9. **Ordern och Stripe.** `POST /api/orders` tar emot fraktalternativ och ombudets id, aldrig ett pris. Servern kontrollerar att ombudet finns för postnumret, räknar priset, sparar allt på ordern och lägger frakten som en egen rad i Stripe.
10. **Kassan i React.** Fraktalternativen, en egen ombudsväljare (ingen `<select>`), beräknad leverans och totalsumman med frakt.
11. **Admin och tacksidan.** Fraktalternativ, fraktpris och ombud syns på ordern.
12. **Produktion.** `POSTNORD_API_KEY` på Vercel, deploy och "Klart när" i den deployade butiken.
13. **README.** Avsnittet om AI, med underlag från den här loggen.

**Beslut du behöver fatta**

- **Priser:** ombud, hemleverans och gränsen för fri frakt. Labben föreslår 59 kr, 99 kr och 500 kr.
- **Butikens postnummer,** alltså varifrån paketen skickas. Det behövs för leveranstiden.
- **När PostNord inte svarar.** Mitt förslag: hemleverans går alltid att välja, eftersom priset är vårt eget. Ombud går inte att välja och leveranstiden visas inte. Kunden kan alltså alltid beställa.

Stämmer planen med hur du vill lägga upp det? Svara gärna på de tre besluten samtidigt.

---

## Prompt 5 (30 okt 2026)

> Jag har en invändning på punkt 6. Vi lägger fraktpriserna i databasen för att slippa redeploy om vi behöver ändra dem och kunden får priserna direkt utan att vi behöver gå in i koden. Dessutom möjliggör det också snabbare justeringar av priser från admins gui. Det är viktigt att vi bygger det så även gamla ordrar visar det fraktpris som gällde vid orderns skapande.

### Svar

Bra invändning. Priset blir data i stället för kod, och då kan den som sköter butiken ändra det utan en utvecklare.

**Så här föreslår jag att det byggs**

- En ny tabell `shipping_methods` med en rad per fraktalternativ: en kod (`ombud`, `hem`), namnet som kunden ser, priset och gränsen för fri frakt. Gränsen ligger på varje rad, så att ombud och hemleverans kan ha olika gränser. Tom gräns betyder ingen fri frakt.
- Ordern sparar en kopia av fraktalternativets namn och det pris kunden faktiskt betalade, inte en hänvisning till tabellen. Det är samma mönster som `order_items`, som redan sparar produktens titel och pris vid köpet. Ändras priset i morgon visar gamla ordrar ändå det pris som gällde då.
- Fri frakt sparas som 0 kr på ordern.
- Servern läser priserna ur tabellen både när kassan frågar och när ordern skapas. Ändrar admin ett pris medan en kund står i kassan gäller priset när ordern skapas, och det är det beloppet Stripe visar.
- En ny sida i admin, "Frakt", där pris och gräns kan ändras, med egen validering och fel under fälten.

**Ändringar i planen**

- Steg 6 blir: tabellen `shipping_methods`, startvärden i `db/seed.sql` och en funktion på servern som räknar fraktpriset utifrån tabellen och varukorgen.
- Steg 8 får kolumnerna fraktalternativ, fraktalternativets namn, fraktpris och ombud på `orders`.
- Nytt steg efter steg 11: adminsidan för frakt, med en route bakom inloggningen.

Kvar att bestämma: startvärdena i tabellen (pris för ombud och hemleverans, gräns för fri frakt), butikens postnummer och vad som händer när PostNord inte svarar.

---

## Prompt 6 (30 okt 2026)

> Gratisnivåerna för fri frakt vill jag att du beräknar utifrån butikens prissättning och tar med PostNords fraktpriser för ombud och hemleverans i beräkningen. Målet är merförsäljning så det optimala är om kunden oftast hamnar precis under gränsen för fri frakt och därmed väljer att lägga till ytterligare en produkt. Butikens postnummer är 39365

### Svar

Jag har räknat på butikens riktiga priser, hämtade från butikens publika produktlista, och på PostNords egna prislistor.

**Underlaget**

- **Butikens priser:** 50 köpbara produkter, från 49 till 299 kr. Medianpriset är 89 kr, så en typisk produkt kostar runt 90 kr.
- **PostNord, ombud (Service Point):** 115 kr upp till 1 kg, 154 kr upp till 2 kg och 170 kr upp till 3 kg, enligt prislistan som gäller från 4 maj 2026.
- **PostNord, hemleverans (PostNord Home):** det finns ingen offentlig lista utan avtal. Närmast är statens ramavtal: 223,60 kr exkl. moms upp till 3 kg. Hemleverans kostar alltså cirka 1,5 gånger så mycket som ombud.
- E-handlare med eget avtal får lägre priser, men de är inte offentliga. Kalkylen räknar därför med det högsta priset butiken kan behöva betala.

**Så räknade jag**

Jag simulerade 200 000 varukorgar utifrån butikens priser. Antaganden: 30 % av kunderna köper en vara, 40 % köper två, 20 % köper tre och 10 % köper fyra. Startsidans tio såser väljs dubbelt så ofta som övriga produkter. En flaska väger cirka 0,35 kg och förpackningen 0,2 kg. Snittordern blir då cirka 225 kr och medianen cirka 200 kr.

För varje gräns räknade jag två andelar: kunder som ligger **precis under** (högst en typisk produkt, 89 kr, från gränsen) och kunder som **redan är över** och får fri frakt utan att köpa mer. Målet är att de som ligger precis under ska vara fler än de som redan är över.

| Gräns | Precis under | Redan över |
|---|---|---|
| 299 kr | 19 % | 26 % |
| 349 kr | 16 % | 18 % |
| 399 kr | 12 % | 11 % |
| 449 kr | 9 % | 7 % |
| 499 kr | 6 % | 4 % |

**Förslag**

- **Ombud: fri frakt från 399 kr.** Där vänder det: fler kunder ligger precis under gränsen än redan över. En vanlig korg med tre såser (cirka 270 till 310 kr) är en produkt från fri frakt. Bara ungefär var tionde kund får fri frakt utan att köpa mer.
- **Hemleverans: fri frakt från 499 kr.** Hemleverans kostar PostNord mer, så gränsen ligger en produkt högre. Det ger också ett andra steg för merförsäljning: en kund som har nått 399 kr och vill ha paketet hem är en produkt från fri hemleverans.

Med PostNords offentliga priser kostar frakten butiken 39 % av ordervärdet vid 399 kr (ombud, 154 kr) och 45 % vid 499 kr (hemleverans, 223,60 kr). Det är dyrt, och därför ligger gränserna inte lägre. Med ett eget avtal hos PostNord går de att sänka, och eftersom priserna ligger i databasen kan det göras i admin.

Butikens postnummer, 393 65, används som avsändare när leveranstiden räknas ut.

Kvar att bestämma: vad kunden betalar för ombud och hemleverans under gränsen (labben föreslår 59 kr och 99 kr), och vad som händer när PostNord inte svarar.

Källor:

- [PostNord: Prislista för kunder som köper frakt hos PostNords ombud, gäller från 4 maj 2026](https://api2.postnord.com/rest/customer/v2/ptm/file/download/0000.29748?disposition=inline)
- [PostNord Home och PostNord Pickup, prisbilaga 2026 i statens ramavtal (Avropa)](https://www.avropa.se/globalassets/bilagor/1.-aktuella-rao/postformedlingstjanster-2021/paketformedlingstjanster--1-lev-postnord/priser-postnord-home-och-pickup--2026.pdf)

---

## Prompt 7 (30 okt 2026)

> Jag vill att du räknar på vad ett genomsnittligt paket väger om kunden är under gränsen och jämför det med de priser du hittade för frakt vid olika vikter. Målet är att inte tappa för mycket marginal för att frakten är för billig, vi vill heller inte avskräcka kunder från att handla för att de tycker frakten är för dyr.
>
> Angående vad som ska ske om PostNord inte svarar. Vi ska skapa ordern, erbjuda leverans till ombud men tydligt förklara för kunden att vi inte kan visa tillgängliga ombud just nu, men att vi ordnar ett lämpligt ombud i efterhand. Vi behöver spara ordern med en status för ombud som pending. I adminpanelen bör en sådan order markeras och där ska admin kunna hämta ombud från postnord och spara det till ordern.

### Svar

**Paketets vikt under gränsen**

Jag uppskattade vikten per produkt utifrån storleken i produktlistan, inklusive glasflaska eller burk: 120 ml 0,28 kg, 150 ml 0,33 kg, 200 ml olja 0,39 kg, 250 ml 0,49 kg, salsa 0,45 kg, chiliflakes 0,15 kg och presentask 1,2 kg. Förpackningen räknas som 0,2 kg. Sedan körde jag samma simulering som förut.

- **Ombud, ordrar under 399 kr** (89 % av alla ordrar): snittvikten är 0,92 kg. 65 % väger högst 1 kg (115 kr hos PostNord) och 35 % mellan 1 och 2 kg (154 kr). Nästan ingen order under gränsen väger över 2 kg. PostNords snittkostnad blir 129 kr, och snittordern är 193 kr.
- **Hemleverans, ordrar under 499 kr** (96 % av alla ordrar): snittvikten är 0,98 kg. PostNord Home har bara en viktklass upp till 3 kg, så kostnaden blir alltid 223,60 kr. Snittordern är 210 kr.

Vikterna är uppskattningar. Väg gärna ett riktigt paket med två eller tre flaskor för att bekräfta.

**Vad kunden betalar och vad butiken står för**

Ombud (PostNord kostar i snitt 129 kr, snittorder 193 kr):

| Kunden betalar | Butiken står för | Andel av ordervärdet |
|---|---|---|
| 49 kr | 80 kr | 41 % |
| 59 kr | 70 kr | 36 % |
| 69 kr | 60 kr | 31 % |
| 79 kr | 50 kr | 26 % |
| 89 kr | 40 kr | 21 % |

Hemleverans (PostNord kostar 224 kr, snittorder 210 kr):

| Kunden betalar | Butiken står för | Andel av ordervärdet |
|---|---|---|
| 99 kr | 125 kr | 59 % |
| 119 kr | 105 kr | 50 % |
| 139 kr | 85 kr | 40 % |
| 159 kr | 65 kr | 31 % |

Med PostNords offentliga priser kostar frakten nästan lika mycket som varorna i en vanlig order. Även om kunden betalade hela kostnaden skulle frakten bli två tredjedelar av ordervärdet för ombud, och det avskräcker. Butiken behöver alltså stå för en del. Jag hittade inga offentliga siffror på hur mycket kunder accepterar att betala, så kundsidan bygger på butikens egna priser.

**Förslag**

- **Ombud: 69 kr.** Det är lägre än en typisk produkt (89 kr), så frakten känns inte som en extra vara. Det är också högre än de billigaste produkterna (49 och 59 kr). En kund nära 399 kr betalar alltså mindre för att lägga till chiliflakes eller sweet chili än för frakten, och det driver merförsäljningen. Butiken står för cirka 60 kr per order och kunden för ungefär hälften av kostnaden.
- **Hemleverans: 139 kr.** Hemleverans är ett bekvämlighetsval, och kunden betalar cirka 60 % av PostNords kostnad. Skillnaden mot ombud, 70 kr, gör att de flesta väljer ombud, som är billigare för butiken. Den som vill ha paketet hem kan fortfarande välja det, och från 399 kr är kunden en produkt från fri hemleverans vid 499 kr.

Med ett eget avtal hos PostNord blir kostnaderna lägre, och då kan priserna ändras i admin utan ny kod.

**När PostNord inte svarar**

- **Kassan:** ombud går att välja som vanligt, men i stället för listan visas en tydlig text, till exempel: "Vi kan inte visa ombud just nu. Vi väljer ett ombud nära din adress åt dig efter beställningen." Beräknad leverans visas inte. Fraktpriset påverkas inte, eftersom det kommer från databasen.
- **Ordern:** sparas med ombudsstatus "Väntar". Samma sak gäller om kunden hann välja ett ombud men PostNord inte svarar när ordern skapas. Servern kan då inte kontrollera valet, så ombudet sparas inte och statusen blir "Väntar". Betalningen går som vanligt.
- **Databasen:** en ny kolumn för ombudsstatus på `orders`, med värdena "Vald" och "Väntar", i samma stil som betalstatusen. Vid hemleverans är den tom.
- **Admin:** ordrar med "Väntar" markeras i orderlistan. På orderns sida finns en knapp "Hämta ombud" som hämtar ombuden för orderns postnummer från PostNord via servern. Admin väljer ett i en egen väljare och sparar. Servern kontrollerar valet mot PostNord igen och sätter statusen till "Vald". Svarar PostNord inte heller då får admin ett begripligt fel, och ordern står kvar som "Väntar".

**Ändringar i planen**

- Steg 8 får också kolumnen för ombudsstatus.
- Steg 9: om PostNord inte svarar sparas ordern med "Väntar" i stället för att stoppas.
- Steg 10: texten i kassan när ombuden inte kan visas.
- Steg 11 får markeringen i orderlistan och "Hämta ombud" på orderns sida, med två nya routes bakom inloggningen.

Kvar att bekräfta: priserna 69 kr för ombud och 139 kr för hemleverans, gränserna 399 kr och 499 kr, och statusnamnen "Vald" och "Väntar".

Källor:

- [PostNord: Prislista för kunder som köper frakt hos PostNords ombud, gäller från 4 maj 2026](https://api2.postnord.com/rest/customer/v2/ptm/file/download/0000.29748?disposition=inline)
- [PostNord Home och PostNord Pickup, prisbilaga 2026 i statens ramavtal (Avropa)](https://www.avropa.se/globalassets/bilagor/1.-aktuella-rao/postformedlingstjanster-2021/paketformedlingstjanster--1-lev-postnord/priser-postnord-home-och-pickup--2026.pdf)
- [PostNord: E-barometern, årsrapport 2025](https://www.postnord.com/insights/reports/e-barometer-2025-annual-report/) (sökt efter hur mycket kunder accepterar att betala för frakt, inga siffror gick att läsa ut)

---

## Prompt 8 (30 okt 2026)

> Jag är nöjd med det svaret. Markera det som beslutat så går vi vidare med implementationen.

### Svar

**Beslutat**

- Ett gemensamt gränssnitt för transportbolag, med PostNord som första adapter. Validering med Zod, allt i TypeScript.
- Fraktpriserna ligger i databasen, i tabellen `shipping_methods`, och ändras i admin. Ordern sparar en kopia av fraktalternativets namn och det pris kunden betalade.
- Ombud kostar 69 kr, med fri frakt från 399 kr. Hemleverans kostar 139 kr, med fri frakt från 499 kr.
- Butikens postnummer är 393 65.
- Om PostNord inte svarar skapas ordern ändå. Ombud går att välja, och kassan förklarar att ett ombud väljs åt kunden i efterhand. Ordern får ombudsstatus "Väntar". Admin hämtar ombud från PostNord på orderns sida och sparar ett, och då blir statusen "Vald".

**Planen som gäller**

1. Gränssnitt för transportbolag.
2. PostNord-adaptern, ombud.
3. Test med sandlådenyckeln.
4. Jämförelse med PostNords dokumentation, och rättning.
5. Leveranstid, med samma fyra steg.
6. Tabellen `shipping_methods` med startvärden, och en funktion som räknar fraktpriset.
7. Route för kassan.
8. Nya kolumner på `orders`: fraktalternativ, fraktalternativets namn, fraktpris, ombud och ombudsstatus.
9. Ordern och Stripe, inklusive "Väntar" när PostNord inte svarar.
10. Kassan i React, inklusive texten när ombuden inte kan visas.
11. Admin och tacksidan: frakten på ordern, markering av "Väntar" och knappen "Hämta ombud".
12. Adminsida för fraktpriserna.
13. Produktion: nyckeln på Vercel, deploy och "Klart när".
14. README.

**Steg 1: gränssnitt för transportbolag**

Ny fil: `server/integrations/shippingCarrier.ts`, med tre typer.

- `ServicePoint` är ett ombud i butikens format: id, namn, gatuadress, postnummer, ort och avstånd i meter.
- `DeliveryEstimate` är beräknad leverans, som ett datum.
- `ShippingCarrier` beskriver vad ett transportbolag ska kunna: hitta ombud för ett postnummer, och beräkna leverans mellan två postnummer. Båda funktionerna kastar ett fel om bolaget inte svarar, och då vet routen att den ska falla tillbaka på "Väntar".

PostNord-adaptern i steg 2 ska följa `ShippingCarrier`. Saknas en funktion, eller har den fel form, säger TypeScript ifrån direkt. Routes och kassan använder bara de här typerna och vet aldrig vilket bolag som ligger bakom.

Nästa steg är PostNord-adaptern för ombud.

---

## Prompt 9 (30 okt 2026)

> Det ser bra ut. Fortsätt.

### Svar

**Steg 2: PostNord-adaptern för ombud**

Det här är AI:ns första version, skriven utifrån vad jag själv vet om PostNords API, utan att läsa dokumentationen först. I steg 3 testar vi den mot sandlådan, och i steg 4 jämför vi med dokumentationen.

Ny fil: `server/integrations/postnordAdapter.ts`

- `findServicePoints(postalCode)` hämtar de fem närmaste ombuden. Funktionen har typen `ShippingCarrier['findServicePoints']`, så TypeScript kontrollerar redan nu att den följer gränssnittet från steg 1. Hela adaptern kopplas ihop med gränssnittet i steg 5, när leveranstiden finns.
- Anropet: `GET {POSTNORD_API_URL}/rest/businesslocation/v5/servicepoints/nearest/byaddress`, med `apikey`, `returnType=json`, `countryCode=SE`, `postalCode` och `numberOfServicePoints=5` i adressen.
- Timeout och omförsök sköts av butikens befintliga `fetchJson`: 5 sekunder, och upp till tre försök vid serverfel.
- Nyckeln skickas i adressen, och `fetchJson` skriver adressen i sina felmeddelanden. Adaptern byter därför ut nyckeln mot `***` innan felet skickas vidare, så att den inte hamnar i serverns loggar.
- Zod i två nivåer: först att svaret har en lista med ombud, sedan varje ombud för sig. Ett trasigt ombud hoppas över, och resten visas ändå.
- Svaret görs om till butikens format, `ServicePoint`: id, namn, gatuadress, postnummer, ort och avstånd.

Ändrad fil: `.env.example` har fått `POSTNORD_API_URL=https://atapi2.postnord.com`, sandlådans adress.

Typkontrollen (`tsc`) går igenom.

**Innan steg 3**

Lägg till raden `POSTNORD_API_URL=https://atapi2.postnord.com` i din `.env`. Jag kan varken läsa eller ändra den filen. Sedan kör jag ett kort testskript som anropar `findServicePoints('39365')` och skriver ut svaret. Skriptet läser nyckeln från `.env` men skriver aldrig ut den, och du godkänner kommandot innan det körs.

---

## Prompt 10 (30 okt 2026)

> Raden med POSTNORD_API_URL är redan tillagd. Jag funderar på en sak. Det är om vi ska tillåta frakt utanför Sverige. Jag vet att uppgiften inte kräver det men det blir motsägelsefullt när vi visar valutor för EUR, NOK och DKK i butiken.

### Svar

Bra fångat. Valutaväljaren och frakten säger olika saker i dag: priserna kan visas i EUR, NOK och DKK, men kassan tar bara emot svenska postnummer (fem siffror), och kunden betalar i kronor.

**Vad frakt utanför Sverige skulle kräva**

- Ett fält för land i kassan, och kontroll av postnumret per land. Norge och Danmark har fyra siffror, Finland fem.
- Egna fraktpriser per land. I PostNords prislista kostar ett paket på 1 kg 379 kr inom EU och 436 kr till Europa utanför EU, mot 115 kr till ett ombud i Sverige. Gränserna för fri frakt skulle inte hålla.
- Norge ligger utanför EU. Enligt PostNords prislista betalar mottagaren tull, moms och avgiften för importdeklarationen. Chilisås är livsmedel, så reglerna för att föra in mat behöver också ses över.
- Momsen vid försäljning till andra EU-länder behöver ses över.
- Leveranstiden ska fungera mellan länder, och den delen av PostNords API har vi inte testat.

**Förslag: bara Sverige, och säg det tydligt**

Valutaväljaren räknar om priserna så att en besökare kan jämföra, men kunden betalar alltid i kronor. Kassan säger redan "Du betalar i svenska kronor." Motsägelsen försvinner om butiken också säger var den skickar:

- I kassan, vid fraktvalet: "Vi skickar bara inom Sverige."
- I varukorgen, där priserna visas i vald valuta: "Du betalar i svenska kronor, och vi skickar bara inom Sverige."

Adaptern stänger inte dörren. Vill du sälja till resten av Norden senare kan gränssnittet få ett land som parameter, och tabellen `shipping_methods` ett land per rad.

Vill du gå på förslaget? Då läggs texterna in i steg 10, och sedan kör jag testet i steg 3.

---

## Prompt 11 (30 okt 2026)

> Det är rimligt. Jag tycker om att bygga så att det går att skala upp om det behövs utan att hela kodbasen skrivs om. currencyAdapter skrev som en tidigare labb och då skulle jag lägga in flera valutor. Så det var inte ett val jag aktivt gjorde. Hade jag fått välja fritt hade valutorna bara funnits för de länder vi fraktar till. Kör vidare enligt plan.

### Svar

**Beslutat:** frakt bara inom Sverige. Texterna om det läggs in i kassan och varukorgen i steg 10. Gränssnittet och tabellen kan utökas med land senare utan att resten skrivs om.

**Steg 3: test med sandlådenyckeln**

Testskriptet låg utanför projektet. Det gjorde ett rått anrop med samma adress som adaptern bygger, och sedan ett anrop via `findServicePoints('39365')`. Nyckeln byttes ut mot `***` i allt som skrevs ut.

Resultat:

- PostNord svarade `200 OK` med JSON. Nyckeln och sandlådans adress fungerar.
- Svaret har den form adaptern räknade med: `servicePointInformationResponse.servicePoints`, och varje ombud har `servicePointId`, `name`, `visitingAddress` (`streetName`, `streetNumber`, `postalCode`, `city`) och `routeDistance` i meter.
- Adaptern gav fem ombud i butikens format. Det närmaste är Ica Supermarket Lindsdal, Kanngjutarvägen 5, 530 meter bort.
- Inget ombud hoppades över av Zod.

Tre saker i svaret som adaptern inte hanterar än:

1. **Paketboxar kommer med.** Fyra av fem är paketboxar ("Parcel Box Location"), som hämtas med PostNord-appen eller BankID. Bara Ica-butiken är ett bemannat ombud ("Postombud"). Paketboxarna har dessutom en tom lista under `pickup.products`, medan Ica-butiken har `Parcel`. Det kan betyda att boxarna inte tar emot den typ av paket vi skickar. Det kontrollerar jag i dokumentationen i steg 4.
2. **Orten kommer med versaler,** "KALMAR". Den bör visas som "Kalmar" i kassan.
3. **Gatunumret kan vara tomt,** till exempel "Lassevägen Miljöhus". Adaptern klarar redan det.

Svaret innehåller också öppettider och koordinater. De används inte nu, men öppettiderna kan visas i kassan om du vill.

Nästa steg är steg 4: jämföra adaptern med PostNords dokumentation, med paketboxarna som första fråga.
