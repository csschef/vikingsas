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

| Gräns  | Precis under | Redan över |
| ------ | ------------ | ---------- |
| 299 kr | 19 %         | 26 %       |
| 349 kr | 16 %         | 18 %       |
| 399 kr | 12 %         | 11 %       |
| 449 kr | 9 %          | 7 %        |
| 499 kr | 6 %          | 4 %        |

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
| -------------- | ---------------- | -------------------- |
| 49 kr          | 80 kr            | 41 %                 |
| 59 kr          | 70 kr            | 36 %                 |
| 69 kr          | 60 kr            | 31 %                 |
| 79 kr          | 50 kr            | 26 %                 |
| 89 kr          | 40 kr            | 21 %                 |

Hemleverans (PostNord kostar 224 kr, snittorder 210 kr):

| Kunden betalar | Butiken står för | Andel av ordervärdet |
| -------------- | ---------------- | -------------------- |
| 99 kr          | 125 kr           | 59 %                 |
| 119 kr         | 105 kr           | 50 %                 |
| 139 kr         | 85 kr            | 40 %                 |
| 159 kr         | 65 kr            | 31 %                 |

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

---

## Prompt 12 (30 okt 2026)

> Jämför PostNords dokumentation med paketboxarna. Jag tycker att det är trevligt att visa koordinater och öppettider för valt ombud. Så det ska du lägga in.

### Svar

**Koordinater och öppettider: inlagda**

- `ServicePoint` i `server/integrations/shippingCarrier.ts` har fått `coordinates` (latitud och longitud) och `openingHours`, en lista med dag, öppnar och stänger. Dagen är en siffra, 1 för måndag till 7 för söndag, så att butikens format inte beror på PostNords engelska dagnamn.
- Adaptern läser `coordinates` (den med `EPSG:4326`, alltså vanlig latitud och longitud) och `openingHours.postalServices`.
- Koordinater och öppettider är extra. Zod-schemat är skrivet så att ett ombud med trasiga öppettider visas ändå, utan dem, i stället för att hoppas över.
- Orten görs om från "KALMAR" till "Kalmar".
- Typkontrollen går igenom. Ett nytt anrop mot sandlådan ger Ica Supermarket Lindsdal med koordinaterna 56.7356, 16.2951 och öppet 07:00 till 22:00 alla dagar.

I kassan (steg 10) föreslår jag att valt ombud visar öppettiderna och en länk, "Visa på karta", som öppnar koordinaterna i en karttjänst.

**Paketboxarna och dokumentationen**

PostNords fullständiga specifikation för Service Points V5 kräver inloggning i utvecklarportalen, så den kan jag inte läsa själv. Det här hittade jag öppet:

- PostNords egen sida för Service Points V5 säger att paketboxar ingår bland platserna, att avståndet räknas längs vägen och inte fågelvägen, och att ett ombuds id bara är unikt tillsammans med landskoden.
- En tredjepartsguide säger att API:t har parametern `typeId` för att välja ombud eller paketboxar. Den anger andra id-nummer än dem vi fick i svaret, där "Postombud" har `typeId` 25 och paketboxen `typeId` 2. Den uppgiften går alltså inte att lita på.

Det räcker inte för att avgöra om boxarna tar emot våra paket, eller hur de ska filtreras bort.

**Det jag behöver från dig**

Logga in på atdeveloper.postnord.com, öppna Service Points V5 och ladda ner specifikationen (JSON). Spara den utanför repot, till exempel i `D:\Fullstack developer\7 Integration med 3e partssystem\postnord-docs\`. Säg till var den ligger, så läser jag den och jämför parameter för parameter med adaptern.

En sak redan nu: eftersom ett id bara är unikt tillsammans med landskoden sparar vi både id och landskod på ordern i steg 8. Vi skickar bara inom Sverige, men det kostar inget och håller dörren öppen.

Källor:

- [PostNord: Service Points V5 i utvecklarportalen](https://developer.postnord.com/apis/details?systemName=location-v5-servicepoints)
- [Omnium: PostNord-integration](https://docs.omnium.no/docs/plugins/Shipments/postnord)
- [PluginHive: PostNord Shipping FAQs](https://www.pluginhive.com/postnord-shipping-faqs-multi-carrier-shipping-label-app-for-shopify/)

---

## Prompt 13 (30 okt 2026)

> Det gick bara att kopiera till urklipp så här kommer rubbet. Du behöver inte spara hela texten som en prompt utan dölj det som kommer efter denna meningen från ai-logg-labb5.md:
>
> _(PostNords OpenAPI-specifikation för Service Points V5, inklistrad som JSON. Utelämnad här.)_

### Svar

**Steg 4: jämförelse med PostNords dokumentation**

Specifikationen klipptes vid 50 000 tecken. Sökvägar och parametrar kom med i sin helhet, men inte slutet med svarsfälten och hur nyckeln ska skickas. Svarsfälten kontrollerades mot ett riktigt svar i steg 3, och nyckeln testade jag mot sandlådan.

**Stämde med dokumentationen**

- Adressen `/rest/businesslocation/v5/servicepoints/nearest/byaddress` och sandlådans server `atapi2.postnord.com`.
- `returnType=json` och `countryCode=SE`, som båda är obligatoriska.
- `numberOfServicePoints=5`, som också är standardvärdet.
- Besöksadressen (`visitingAddress`) är den som ska visas för kunden. Leveransadressen är till för fraktsedlar.

**Skilde sig, och hur det löstes**

1. **Nyckeln låg i adressen.** Delen av specifikationen som beskriver nyckeln kom inte med, så jag testade: utan nyckel svarar PostNord 403, med huvudet `apikey` 200, och med huvudet `x-api-key` 403. Nyckeln skickas nu i huvudet `apikey`. Då kan den aldrig hamna i ett felmeddelande, och maskeringen är borttagen.
2. **Postnumret ska skickas utan mellanslag.** Adaptern tar nu bort mellanslag själv, i stället för att lita på att routen redan har gjort det.
3. **`context` saknades.** Standardvärdet `optionalservicepoint` ger bara platser som tar emot leveranser och rekommenderas för kassor. Det skickas nu uttryckligen, så att adaptern inte beror på ett standardvärde.
4. **Ombudets id är bara unikt tillsammans med landskoden.** Landskoden sparas på ordern i steg 8.
5. **Dokumentationen rekommenderar så detaljerad adress som möjligt.** En gatuadress ger mer exakta avstånd. Labben utgår från postnumret, och kassan hämtar ombuden så fort postnumret är ifyllt, så jag föreslår att vi stannar vid postnumret.
6. **`typeId` saknades, så alla typer kom med.** Se nästa avsnitt.

Typkontrollen går igenom, och ett nytt anrop med nyckeln i huvudet ger samma fem platser som förut.

**Paketboxarna**

Paketboxarna tar emot leveranser: de kommer med även med `context=optionalservicepoint`, som bara ger platser som tar emot paket. Varför deras lista `pickup.products` är tom förklaras inte i den del som kom med. Dokumentationen rekommenderar att ombud och paketboxar hålls isär med `typeId`: paketboxar är typ 2, och ombud är typ 4, 6, 24, 25, 37, 38, 44, 46, 54 och 61.

Två vägar:

- **Bara ombud.** Adaptern skickar ombudens typer i `typeId`, och kunden får fem bemannade ombud. Fraktpriset vi räknade fram bygger på PostNords pris för ombud, så det stämmer. Paketbox kan läggas till senare som ett eget fraktalternativ, med en ny rad och ett eget pris i `shipping_methods`.
- **Både ombud och paketboxar, i två grupper.** Två anrop till PostNord, ett per typ, och kassan visar dem under var sin rubrik. Bekvämt för kunden, men dubbelt så många anrop, och priset för paketbox är inte utrett.

Jag rekommenderar bara ombud nu. Det följer dokumentationen, stämmer med prisberäkningen, och tabellen gör det enkelt att lägga till paketbox senare. Jag använder hela listan med ombudstyper, inte bara de svenska, så att den fungerar om butiken börjar skicka till fler länder.

Valfritt: vill du att även svarsfälten jämförs mot dokumentationen kan du klistra in slutet av specifikationen, delen som börjar med `"components"`.

---

## Prompt 14 (30 okt 2026)

> Här är den kompletta dokumentationen: "D:\Fullstack developer\7 Integration med 3e partssystem\Service Points V5.json"
>
> Jag vill ha med paketboxar. Det är standard idag och vi ska inte vara sämre.

### Svar

**Hela specifikationen: det som var nytt**

1. **Nyckeln ska enligt dokumentationen skickas i adressen,** som parametern `apikey`. I förra steget flyttade jag den till ett huvud efter ett test. Det fungerar, men det är inte dokumenterat och kan sluta fungera utan förvarning. Adaptern följer nu dokumentationen igen: nyckeln ligger i adressen, och maskeringen är tillbaka så att den inte hamnar i ett felmeddelande.
2. **Dokumentationen har bytt plats på latitud och longitud.** Den beskriver `northing` som longitud och `easting` som latitud. I svaren är `northing` 56,7 för Kalmar, och det är latituden. Adaptern följer svaren, och en kommentar i koden förklarar varför.
3. **Dokumentationens lista med ombudstyper fungerar inte som den står.** Den rekommenderar `typeId` 4, 6, 24, 25, 37, 38, 44, 46, 54 och 61 för ombud, men PostNord svarar 400 med "Invalid typeId: 4 for countryCode: SE". Listan blandar typer från flera länder. För Sverige gäller 24 (Business Centre), 25 (Servicepoint) och 54 (Delivery Office), och de fungerar.
4. Fälten adaptern läser (`servicePointId`, `name`, `visitingAddress`, `routeDistance`, `coordinates` och `openingHours`) finns alla i dokumentationen. Inget av dem är obligatoriskt där, så det är rätt att Zod hoppar över ett ombud som saknar namn eller adress.
5. Dagarna i öppettiderna skrivs "MONDAY" i dokumentationen men "Monday" i svaren. Adaptern klarar båda.

**Paketboxar: inlagda**

- Ombud och paketboxar hämtas i två samtidiga anrop, som dokumentationen rekommenderar: `typeId=24,25,54` för ombud och `typeId=2` för paketboxar, fem av varje.
- `ServicePoint` har fått `kind` (`servicePoint` eller `parcelBox`), så att kassan kan visa dem i var sin grupp.
- `ServicePoint` har också fått `pickupRequirements`. För paketboxarna är det "PostNord App" och "BankID", så att kassan kan tala om vad som krävs för att hämta paketet.
- Svarar PostNord inte på något av anropen räknas det som att PostNord inte svarar, och ordern får "Väntar". Då görs kontrollen av kundens val alltid mot hela listan.

**Test mot sandlådan**

- `39365` och `393 65` ger samma tio platser: fem ombud (närmast Ica Supermarket Lindsdal, 530 m) och fem paketboxar (närmast Paketbox Miljöhus Lassevägen, 927 m).
- Alla har koordinater och öppettider, och paketboxarna har kraven PostNord App och BankID.
- Fel nyckel ger 403, och felmeddelandet visar `apikey=***`.
- Typkontrollen går igenom.

**En fråga om priset**

Paketboxen räknas i dag som leverans till ombud, med samma pris: 69 kr och fri frakt från 399 kr. PostNords prislista har inget eget pris för paketbox. Ska det vara så? Då kan fraktalternativet i databasen heta "Ombud eller paketbox".

Nästa steg är steg 5, leveranstiden.

---

## Prompt 15 (30 okt 2026)

> Vi behåller samma fraktpriser. Gå vidare med leveranstiden

### Svar

**Beslutat:** paketbox har samma pris som ombud.

**Steg 5: leveranstid, AI:ns första version**

- `estimateDelivery(fromPostalCode, toPostalCode)` i `server/integrations/postnordAdapter.ts`, skriven utifrån vad jag själv vet om PostNords API, utan dokumentationen: `GET {POSTNORD_API_URL}/rest/transport/v1/transittime/getTransitTimeInformation.json` med avgångsdag, från- och till-postnummer, landskod SE och `serviceCode=19`, som jag tror är MyPack Collect (paket till ombud).
- Ett Zod-schema som väntar sig `transitTimeResponse.transitTimes[].deliveryDate`. Funktionen returnerar datumet som `YYYY-MM-DD`.
- Avgångsdagen är dagens datum i svensk tid, eftersom servern på Vercel går på UTC. Annars skulle ett köp strax efter midnatt räknas från fel dag.
- Adaptern är nu hel: `postnord` följer `ShippingCarrier`, och `server/integrations/shippingCarrier.ts` exporterar `shippingCarrier`, som routes ska använda. Byts bolag ändras bara den raden.
- Typkontrollen går igenom.

**Test mot sandlådan**

PostNord svarade `502 Bad Gateway`, både direkt och via adaptern. Det betyder att PostNords server inte kunde skicka anropet vidare till någon tjänst, alltså att adressen troligen är fel, föråldrad eller inte ingår i kontot. Adaptern gjorde tre försök med en sekunds mellanrum och gav sedan ett felmeddelande med nyckeln maskerad, precis som tänkt. I kassan hade det betytt att leveranstiden inte visas.

Två tredjepartskällor anger samma adress som jag, men en av dem skriver att adressen för leveranstid beror på vilken plan och vilket avtal man har. PostNords egen sida nämner ett "Delivery Options API" med leveranstider.

**Det jag behöver från dig**

Leta i sandlådeportalen efter API:t för leveranstid. Det kan heta något med "Transit Time" eller "Delivery Options", troligen under kategorin "Before Order" eller "Transport". Kontrollera också att det ingår i din Customer plan. Spara specifikationen som förra gången, så jämför jag.

Källor:

- [Jentic: PostNord API](https://jentic.com/apis/postnord.com/postnord)
- [Glama: postnord-mcp](https://glama.ai/mcp/servers/fredrsat/postnord-mcp)
- [PostNord: PostNord API](https://www.postnord.com/services/ecommerce-integrations/postnord-api/)

---

## Prompt 16 (30 okt 2026)

> PostNords officiella dokumentation visar endpointen /transittime/addresstoaddress, inte /rest/transport/v1/transittime/getTransitTimeInformation.json.
>
> Kontrollera implementationen mot den dokumenterade endpointen och dess parametrar. Använd serviceCodes=19 och serviceGroup=SE för MyPack Collect.
>
> Kontrollera även hur API:ets svar faktiskt ser ut innan du fastställer Zod-schemat.
>
> Gör inga antaganden om svarsfältens struktur.
>
> Ändra inte koden förrän du har presenterat vilka ändringar som behövs.
>
> De har också dokumentation för Adress to Location vilket är relevant för oss.

### Svar

Ingen kod är ändrad.

**Vad jag kunde kontrollera**

Specifikationen för leveranstid finns inte sparad, bara den för ombud. Jag gjorde därför anrop mot sandlådan med `serviceGroup=SE` och `serviceCodes=19`, för att se var endpointsen ligger och vad de själva säger:

- `/rest/transport/v1/transittime/addresstoaddress` och `/rest/transport/v2/transittime/addresstoaddress` svarar båda 400: "Required request parameter 'startTime' ... is not present". Endpointen finns alltså i två versioner.
- `/transittime/addresstolocation` svarar likadant i `v1` och `v2`.
- `v3` finns inte, den ger 404.

PostNord säger bara att `startTime` saknas, inte vilket format den ska ha eller vilka parametrar som kommer efter. Att prova sig fram vore att gissa, så parametrarna behöver komma från dokumentationen. Svaret har jag inte kunnat se än, eftersom inget anrop har gått igenom.

**Ändringar som behövs, när dokumentationen finns**

1. **Endpoint:** `getTransitTimeInformation.json` byts mot `/transittime/addresstoaddress`, i den version dokumentationen anger (`v1` eller `v2`).
2. **Parametrar:** `serviceCode` blir `serviceCodes=19`, och `serviceGroupCode` blir `serviceGroup=SE`. `dateOfDeparture` byts troligen mot `startTime`, i det format dokumentationen anger. Postnummerparametrarna får de namn dokumentationen anger.
3. **Zod-schemat:** mitt nuvarande schema (`transitTimeResponse.transitTimes[].deliveryDate`) var en gissning. Det skrivs om först när ett riktigt svar har kommit tillbaka och jämförts med dokumentationen.
4. **Address to Location för ombud och paketbox:** med den endpointen räknas leveranstiden till det valda ombudet, i stället för till kundens postnummer. Det är mer exakt. Då behöver `estimateDelivery` i gränssnittet kunna ta emot ombudets id. Exakt hur avgörs när parametrarna är kända.
5. **Hemleverans:** `serviceCodes=19` gäller MyPack Collect. Vilken kod hemleverans har behöver också komma från dokumentationen.

**Det jag behöver från dig**

Spara specifikationen för leveranstid, den som innehåller både Address to Address och Address to Location, i samma mapp som förra: `D:\Fullstack developer\7 Integration med 3e partssystem\`. Säg till när den ligger där, så läser jag parametrarna, gör ett anrop och visar svaret innan jag föreslår Zod-schemat.

---

## Prompt 17 (30 okt 2026)

> Varsågod: "D:\Fullstack developer\7 Integration med 3e partssystem\PostNord Adress to Adress and Adress to Location.txt"

### Svar

Ingen kod är ändrad. Jag har läst dokumentationen och gjort testanrop mot sandlådan för att se hur svaren faktiskt ser ut.

**Vad dokumentationen säger**

- Obligatoriskt: `apikey`, `startTime` (tiden då PostNord får paketet, i lokal tid, till exempel `2023-11-06T12:00:00`), `serviceGroup=SE`, `originPostCode`, `originCountryCode` och `destinationCountryCode`.
- Address to Address kräver också mottagarens postnummer, gata och gatunummer. Address to Location kräver i stället `destinationLocationId` och `destinationLocationType` (`depot`, `hub`, `servicepoint` eller `customer`).
- `serviceCodes`: 17 är MyPack Home (hemleverans), 18 Parcel och 19 MyPack Collect (ombud).
- Dokumentationen visar inget exempel på svar ("No response body").

**Vad testanropen visade**

Från butikens postnummer 393 65, med `startTime` satt till nuvarande tid i Sverige:

1. **Version:** dokumentationen anger ingen version. `v1` och `v2` finns båda, men `v2` kräver parametern `destinationProductionPointId` i stället för `destinationLocationId`. Dokumentationen beskriver alltså `v1`.
2. **Svaret är en lista,** inte ett objekt. Varje rad är en variant av tjänsten: grundtjänsten utan tillägg, och varianter med tillägg som paketbox, id-kontroll eller leverans samma dag.
3. **En rad i `v1` ser ut så här:** `timeOfArrival` ("2026-11-02T18:00:00"), `timeOfDeparture`, `latestTimeOfBooking` ("2026-10-30T14:00:00"), `possibleDeviation`, `serviceInformation` med `serviceCode`, `name` och ibland `additionalServices`, och för ombud även `deliveryPoint` med ombudets adress.
4. **Fel kommer inuti ett lyckat svar.** Med ett id som inte finns svarar PostNord `200 OK` med raden `{ "errorMessage": "Requested destination location ... not found.", "isBookable": false, "isSupported": false }`. Det räcker alltså inte att kontrollera `response.ok`, adaptern måste titta i raderna.
5. **Address to Location tar ombudets `servicePointId`.** Ica Supermarket Lindsdal (331366) och paketboxen på Lassevägen (2696390) fungerar båda med `destinationLocationType=servicepoint`. PostNords andra id, `pudoId` (SE20135), ger "not found".
6. **Gatuadressen är inte nödvändig i praktiken.** Dokumentationen säger att mottagarens gata och nummer krävs, men Address to Address svarar likadant med bara postnumret.
7. **Exempel:** beställt fredag 30 oktober kl. 10.50, sista bokningstid 14.00, avgång samma dag 17.30, framme måndag 2 november. Samma för ombud och hemleverans till Stockholm.

**Skillnader mot dokumentationen**

- Exemplet för Address to Location i dokumentationen pekar på `/addresstoaddress`. Den riktiga endpointen är `/addresstolocation`.
- Versionen står inte, och `v2` har andra parameternamn och ett annat svar.
- Gata och gatunummer markeras som obligatoriska, men behövs inte.
- Dokumentationen saknar exempel på svar, och felen kommer som rader i ett `200`-svar.

**Ändringar jag föreslår**

1. **Gränssnittet** (`shippingCarrier.ts`): `estimateDelivery` tar ett objekt i stället för två postnummer, så att kassan kan fråga om rätt leveranssätt:

   ```ts
   export type DeliveryRequest = {
     fromPostalCode: string
     toPostalCode: string
     toStreet?: string
     delivery: 'home' | 'servicePoint'
     servicePointId?: string
   }
   ```

2. **Adaptern** (`postnordAdapter.ts`): den gissade koden (`getTransitTimeInformation.json`, `transitTimeResponse`) tas bort och ersätts med `v1` enligt dokumentationen:
   - Hemleverans: `/rest/transport/v1/transittime/addresstoaddress` med `serviceCodes=17`.
   - Valt ombud eller paketbox: `/rest/transport/v1/transittime/addresstolocation` med `serviceCodes=19`, `destinationLocationId` = ombudets id och `destinationLocationType=servicepoint`.
   - Ombud innan kunden har valt: `/addresstoaddress` med `serviceCodes=19`, som räknar till PostNords standardombud för postnumret.
   - `startTime` är nuvarande tid i Sverige, och `serviceGroup=SE`, `originPostCode=39365`, `originCountryCode=SE` och `destinationCountryCode=SE`.
   - Finns kundens gatuadress, till exempel "Storgatan 5", delas den upp i `destinationStreetName` och `destinationStreetNumber`, eftersom dokumentationen ber om det. Annars skickas bara postnumret.
3. **Zod-schemat**, byggt på de riktiga svaren:

   ```ts
   const PostNordTransitTimeResponseSchema = z.array(z.unknown())

   const PostNordTransitTimeRowSchema = z.object({
     timeOfArrival: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
     serviceInformation: z.object({
       serviceCode: z.string(),
       additionalServices: z.array(z.unknown()).optional(),
     }),
   })
   ```

   Först kontrolleras att svaret är en lista. Sedan kontrolleras varje rad för sig. Rader med `errorMessage` klarar inte schemat och hoppas över. Av de rader som är kvar används grundtjänsten, alltså raden med rätt `serviceCode` och utan `additionalServices`. Finns ingen sådan rad kastar adaptern ett fel, och kassan visar då ingen leveranstid.

4. **Svaret till butiken** är som förut `{ date: 'YYYY-MM-DD' }`, taget från `timeOfArrival`.

Säg till om förslaget ser rätt ut, så gör jag ändringarna och testar dem mot sandlådan.

---

## Prompt 18 (30 okt 2026)

> Hahaha, punkt 4, typiskt PostNord beteende. De skickar trasiga paket även digitalt xD
>
> Här kommer en djupare del av att använda ai för utveckling, jag validerade dina svar externt mot en annan ai för att kontrollera dig och här kommer det svaret:
>
> **1. Förbättra Zod-valideringen**
>
> Jag vill att vi skiljer mellan:
>
> - Ett giltigt svar med beräknad leveranstid.
> - Ett giltigt svar där leverans inte stöds.
> - Ett felmeddelande från PostNord.
> - Ett oväntat eller felaktigt formaterat API-svar.
>
> Undvik att tyst hoppa över alla rader som inte matchar schemat. Vi behöver kunna förstå varför en leveranstid saknas.
>
> Logga relevanta fel på serversidan, men aldrig API-nycklar eller fullständiga URL:er som innehåller nycklar.
>
> **2. Undersök `isBookable` och `isSupported`**
>
> Du har upptäckt dessa fält i API-svaren. Kontrollera vad de faktiskt betyder och om de förekommer även i lyckade svar.
>
> Vi använder API:et för att uppskatta leveranstid, inte för att boka transporter. Därför ska vi inte automatiskt kräva `isBookable: true` utan att först förstå innebörden.
>
> Dokumentera slutsatsen.
>
> **3. Korrigera `startTime`**
>
> Vi ska inte använda kundens beställningstid som om paketet redan överlämnats till PostNord.
>
> Implementera en enkel funktion som beräknar nästa möjliga överlämningstid utifrån svenska vardagar och en konfigurerbar bryttid.
>
> Utgå tills vidare från:
>
> - Beställning före kl. 12.00 på vardagar: överlämning samma dag kl. 14.00.
> - Beställning efter kl. 12.00: nästa vardag kl. 14.00.
> - Beställning under helgen: måndag kl. 14.00.
>
> Detta är våra egna antaganden för laborationen, inte garanterade upphämtningstider från PostNord. Hantera svensk tidszon och sommar-/vintertid korrekt. Dokumentera att helgdagar ännu inte hanteras.
>
> **4. Håll leveranstid och ombudssökning oberoende**
>
> Ett fel vid beräkning av leveranstid får aldrig hindra kunden från att beställa.
>
> Om leveranstiden inte kan hämtas visar vi:
>
> "Beräknad leveranstid är tillfälligt otillgänglig."
>
> Om ombudssökningen fungerar ska kunden fortfarande kunna välja ombud, även om leveranstidsberäkningen misslyckas.
>
> Om ombudssökningen misslyckas använder vi vår tidigare beslutade fallback med manuell tilldelning av ombud.
>
> **5. Hantera adresser pragmatiskt**
>
> Undvik att bygga en komplicerad adressparser enbart för denna integration.
>
> Om API:et fungerar med postnummer för en uppskattad leveranstid kan vi använda det, men dokumentera avvikelsen från PostNords specifikation.
>
> Om fullständig adress behövs ska vi inte anta att alla svenska adresser följer formatet "Gatunamn 5".
>
> **6. Val av leveranstid**
>
> Använd rätt tjänst och destination:
>
> - Hemleverans: serviceCode 17.
> - Ombud och paketbox: serviceCode 19.
> - När kunden valt ett specifikt ombud ska leveranstiden beräknas till just det ombudet.
>
> Välj grundtjänsten utan tilläggstjänster när ett sådant giltigt svar finns. Om flera giltiga grundtjänstsvar finns ska urvalet vara deterministiskt och dokumenterat.
>
> Visa leveranstiden som en uppskattning, aldrig som ett garanterat leveransdatum.
>
> **7. Tester**
>
> Jag vill att du testar:
>
> - Giltig leveranstid för hemleverans.
> - Giltig leveranstid för ombud.
> - Giltig leveranstid för paketbox.
> - Ogiltigt ombuds-ID.
> - PostNord svarar med HTTP 200 men innehåller ett fel.
> - PostNord svarar med 502 eller timeout.
> - Oväntad JSON-struktur.
> - Beställning på fredag efter bryttiden.
> - Beställning under helgen.
>
> Använd mockade API-svar för feltester där det är lämpligt. Vi behöver inte orsaka riktiga fel hos PostNord.
>
> **8. Säkerhet**
>
> API-nyckeln ska endast användas på servern. Läs inte `.env` och exponera aldrig nyckeln i loggar, felmeddelanden eller klientkod.
>
> **Arbetssätt**
>
> Implementera detta stegvis enligt vår tidigare överenskommelse. Redovisa vilka filer du tänker ändra innan du gör ändringarna, och invänta mitt godkännande för varje steg och terminalkommando.
>
> Dokumentera också vilka antaganden som visade sig felaktiga, vilka avvikelser vi upptäckte i PostNords dokumentation och hur vi korrigerade implementationen. Det ska senare användas i laborationens README.

### Svar

Ja, ett `200 OK` som innehåller "not found" är ungefär som en avi om att paketet är framme, fast skåpet är tomt.

Bra granskning. Här är planen steg för steg, med de filer varje steg ändrar. Ingenting görs förrän du har godkänt steg A.

**Det jag redan vet om `isBookable` och `isSupported`**

Fälten nämns inte i någon av de två dokumentationsfilerna. Testanropen hittills har visat:

- **`v1`, som vi använder:** lyckade rader saknar båda fälten. Felraden för ett okänt ombuds-id hade `isBookable: false` och `isSupported: false`, tillsammans med `errorMessage`.
- **`v2`:** lyckade rader har `isBookable: true` och `isSupported: true`. "Leverans samma dag erbjuds inte från 393 65" gav `isBookable: false` och `isSupported: true` för hemleverans, men `false` och `false` för ombud.

Min tolkning, som PostNord inte bekräftar någonstans: `isSupported` säger om tjänsten finns för sträckan, och `isBookable` om den går att boka med de uppgifter som skickades. I `v1` finns fälten bara på rader som redan har `errorMessage`, så de säger inget nytt. Slutsats: vi kräver inte `isBookable: true`. En rad räknas som lyckad när den har en giltig `timeOfArrival`, och som misslyckad när den har `errorMessage`. Steg A prövar slutsatsen mot fler fall.

**Steg A: undersökning, inga filer ändras**

Ett terminalkommando med tre anrop mot `v1` i sandlådan: ett postnummer som inte finns, ett ogiltigt ombuds-id med hela svaret, och en tilläggstjänst som kanske inte erbjuds från 393 65 (kod 10, före kl. 9). Svaren sparas i min tillfälliga mapp utanför repot och blir underlag för de låtsade svaren i testerna.

**Steg B: `server/lib/fetchJson.ts`**

`fetchJson` läser inte innehållet i ett felsvar, så PostNords förklaring försvinner, och felmeddelandet innehåller hela adressen. Förslag: en liten felklass `HttpError` med `status` och `body`. Texten i felmeddelandet ändras inte, så de andra adaptrarna påverkas inte. Det är delad kod, så det är ditt beslut.

**Steg C: ny fil `server/lib/handoverTime.ts`**

- `nextHandoverTime(now)` räknar ut nästa överlämning enligt dina regler.
- Den läser svensk väggtid med `Intl` och tidszonen `Europe/Stockholm`, och skickar tiden till PostNord som lokal tid utan tidszon, i det format dokumentationen visar. Sommar- och vintertid sköts då av tidszonsdatabasen.
- Bryttid och överlämningstid läses från `.env` (`SHIPPING_CUTOFF_HOUR` och `SHIPPING_HANDOVER_HOUR`), med 12 och 14 som standard. `.env.example` får raderna.
- Helgdagar hanteras inte än. Det står i en kommentar och i dokumentationen.

Överlämningen är butikens regel, inte PostNords, så den ligger utanför adaptern och skickas med till den.

**Steg D: `server/integrations/shippingCarrier.ts`**

- `DeliveryRequest`: `fromPostalCode`, `toPostalCode`, `handoverTime`, `delivery` (`'home'` eller `'servicePoint'`) och ett valfritt `servicePointId`. Ingen gatuadress.
- `estimateDelivery` kastar inte längre fel utan returnerar ett av fyra utfall:

  ```ts
  export type DeliveryEstimateResult =
    | { status: 'estimate'; date: string }
    | { status: 'notSupported'; reason: string }
    | { status: 'carrierError'; reason: string }
    | { status: 'invalidResponse'; reason: string }
  ```

- `estimate`: giltigt svar med leveranstid.
- `notSupported`: giltigt svar där PostNord förklarar på en rad att leveransen inte går, till exempel "is not offered from postal code" eller "location not found". Det är också så ett ogiltigt ombuds-id och "200 med fel" landar.
- `carrierError`: PostNord svarar med en felkod, eller inte alls inom tiden (502 och timeout hamnar här).
- `invalidResponse`: svaret, eller en rad i det, har en form vi inte känner igen.

Routen loggar `reason` och visar "Beräknad leveranstid är tillfälligt otillgänglig." för allt utom `estimate`.

**Steg E: `server/integrations/postnordAdapter.ts`**

- Den gissade koden tas bort. `v1` `/addresstoaddress` används för hemleverans (17) och för ombud innan kunden har valt (19). `v1` `/addresstolocation` används för valt ombud eller paketbox (19). Bara postnummer skickas, och avvikelsen från dokumentationen skrivs ner.
- Varje rad kontrolleras mot två scheman: en lyckad rad (`timeOfArrival`, `serviceInformation.serviceCode` och valfria `additionalServices`) och en felrad (`errorMessage`). En rad som inte passar något av dem gör hela svaret till `invalidResponse`, i stället för att hoppas över tyst.
- Urval: bland lyckade rader med rätt `serviceCode` och utan `additionalServices` väljs den med tidigast `timeOfArrival`. Är två lika väljs den som kommer först i PostNords lista. Regeln står i en kommentar.
- Loggning: felmeddelandena byggs utan adress, bara med endpointens namn, statuskoden och PostNords förklaring. Det gäller även ombudssökningen, så maskeringen av nyckeln behövs inte längre.

**Steg F: tester**

Projektet har inget testverktyg. Förslag: Nodes inbyggda testkörare via `tsx`, som redan finns, alltså inget nytt paket. Nytt skript i `package.json`: `"test": "tsx --test server/**/*.test.ts"`.

- `server/lib/handoverTime.test.ts`: vardag före och efter 12, fredag efter bryttiden, lördag, söndag, och dagarna när sommartid börjar och slutar.
- `server/integrations/postnordAdapter.test.ts`: med en låtsad `fetch` som ger svaren från steg A: hemleverans, ombud, paketbox, ogiltigt ombuds-id, 200 med fel, 502, timeout och oväntad JSON. Testerna anropar aldrig PostNord.
- Ett kort skript utanför repot som kör hemleverans, ombud, paketbox och ogiltigt id mot sandlådan på riktigt.

**Steg G: dokumentation**

Ny fil `docs/postnord-avvikelser.md` med tre listor: antaganden som visade sig fel, avvikelser i PostNords dokumentation, och hur koden rättades. Den blir underlag för README i steg 14.

Punkt 4 i granskningen hör till steg 7 i huvudplanen, routen för kassan: ombud och leveranstid hämtas var för sig, och kassan visar "Beräknad leveranstid är tillfälligt otillgänglig." när leveranstiden saknas. Kassan skriver alltid "Beräknad leverans", aldrig ett lovat datum.

Får jag börja med steg A?

---

## Prompt 19 (30 okt 2026)

> Jag godkänner steg A, men har några invändningar.
>
> Visa först det exakta terminalkommandot så att jag kan granska det innan körning. API-nyckeln får inte exponeras i kommandot, terminalhistoriken, loggar eller sparade testsvar.
>
> Genomför de tre undersökningarna och redovisa resultaten. Ändra ingen projektkod ännu.
>
> Jag har också några synpunkter på kommande steg:
>
> B: Motivera varför den gemensamma `fetchJson.ts` behöver ändras. Jag vill undvika att påverka andra integrationer om PostNords särskilda felhantering kan lösas i adaptern.
>
> D: Skilj på ogiltigt ombuds-ID och en leveranstjänst som inte stöds. Det är olika situationer och bör inte automatiskt behandlas likadant.
>
> E: Behåll skyddet mot att API-nycklar exponeras i loggar. Vi ska inte förlita oss enbart på att våra egna felmeddelanden saknar URL:er.
>
> I övrigt tycker jag att planen ser bra ut.
>
> Efter steg A vill jag se resultaten och dina eventuella rekommenderade justeringar innan vi går vidare till steg B.

### Svar

Ingen projektkod är ändrad.

**Kommandot, visat före körning och godkänt av dig**

```
cd "D:/Fullstack developer/6. Systemutveckling/fsu25d-systemutveckling-uppgift-1-min-egna-e-handel-csschef" && node --env-file=.env node_modules/tsx/dist/cli.mjs "<min tillfälliga mapp>/stepA.mts" < /dev/null
```

- Nyckeln står inte i kommandot. `node --env-file=.env` lägger den i processens miljö, och skriptet läser den därifrån. Jag läser aldrig själva `.env`.
- Skriptet ligger utanför repot. Det skriver ut parametrarna innan nyckeln läggs till i adressen, och allt som skrivs ut eller sparas går först genom en maskering som byter ut nyckeln mot `***`.
- Sist kontrollerade skriptet de sparade svaren. Resultat: "Nyckeln i sparade svar: nej".

Alla tre anropen gick mot `v1`, med överlämning måndag 2 november kl. 14.00 från 393 65.

**Resultat**

1. **Postnummer som inte finns (00000), ombud:** `400 Bad Request` med JSON: `faultCode` "API-009", `explanationText` "Postal code '00000' does not exist for country code 'SE'", och vilken parameter det gäller (`destinationPostCode`). Ett felaktigt postnummer ger alltså en felkod, inte en felrad i ett lyckat svar.
2. **Ogiltigt ombuds-id (999999999):** `200 OK` med en enda rad: `errorMessage` "Requested destination location '999999999-SERVICE_POINT-SE' not found.", `isBookable: false` och `isSupported: false`.
3. **Hemleverans med tilläggstjänsten före kl. 9 (kod 10), till 111 51:** `200 OK` med en enda rad, och det är grundtjänsten PostNord Home utan tillägg: framme tisdag 3 november kl. 18. Ingen felrad. En variant som inte erbjuds försvinner alltså tyst ur listan i `v1`.

Dessutom: `latestTimeOfBooking` är 14.00 vid 393 65, samma tid som vår antagna överlämning.

**Slutsats om `isBookable` och `isSupported`**

I `v1` finns fälten bara på felrader, och där har de alltid varit `false` båda två. Lyckade rader saknar dem helt. De säger alltså inget som inte `errorMessage` redan säger, och PostNord förklarar dem inte i dokumentationen. Vi använder dem inte för några beslut. En rad med giltig `timeOfArrival` är lyckad, och en rad med `errorMessage` är ett fel.

**Rekommenderade justeringar**

**B: `fetchJson.ts` ändras inte.** Resultat 1 visar att PostNords förklaring finns i felsvarets innehåll, och `fetchJson` läser inte det. Men det går att lösa i adaptern. Adaptern får en egen liten hjälpfunktion för PostNord-anrop, med timeout, som läser svaret både vid lyckat anrop och vid felkod. Andra integrationer påverkas inte. Det som går förlorat är omförsöken i `fetchJson`. Jag rekommenderar inga omförsök mot PostNord: kassan har redan reservlösningar (ombud "Väntar" och "Beräknad leveranstid är tillfälligt otillgänglig."), och kunden ska inte vänta flera sekunder i kassan.

**D: fler utfall än fyra, så att olika situationer skiljs åt.** Resultaten visar tre olika sorters "ingen leveranstid":

```ts
export type DeliveryEstimateResult =
  | { status: 'estimate'; date: string }
  | { status: 'notSupported'; reason: string }
  | { status: 'invalidServicePoint'; reason: string }
  | { status: 'rejected'; reason: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'invalidResponse'; reason: string }
```

- `estimate`: grundtjänsten finns med en giltig `timeOfArrival`.
- `notSupported`: ett giltigt svar utan felrader, där grundtjänsten saknas. Så ser en tjänst som inte erbjuds ut i `v1` (resultat 3).
- `invalidServicePoint`: ett giltigt svar från `/addresstolocation` med felrad, som för ett ombuds-id som inte finns (resultat 2). Begränsning: `v1` har ingen felkod på raden, så det är endpointen och felraden som avgör, inte texten. Det är den enda felrad vi har sett från den endpointen.
- `rejected`: PostNord svarar med en felkod i 400-serien och en förklaring, som för ett postnummer som inte finns (resultat 1). Förklaringen följer med i `reason`.
- `unavailable`: felkod i 500-serien, timeout eller nätverksfel.
- `invalidResponse`: svaret, eller en rad i det, har en form vi inte känner igen.

Kunden ser samma text för allt utom `estimate`, men loggen visar vilket utfall det var och varför.

**E: maskeringen av nyckeln behålls.** Alla texter som lämnar adaptern, i felmeddelanden, i loggar och i `reason`, går genom samma maskering som i dag, även om de inte ska innehålla någon adress. Det är ett andra skydd om något oväntat, som ett felsvar från PostNord, skulle innehålla nyckeln.

**Planen efter justeringarna**

- Steg B utgår: ingen ändring i `fetchJson.ts`. Hjälpfunktionen för PostNord blir en del av steg E.
- Steg C: `server/lib/handoverTime.ts`, oförändrat.
- Steg D: `server/integrations/shippingCarrier.ts`, med sex utfall.
- Steg E: `server/integrations/postnordAdapter.ts`, med egen hjälpfunktion och maskering.
- Steg F och G: oförändrade. Svaren från steg A blir underlag för testernas låtsade svar.

Godkänner du justeringarna? Då börjar jag med steg C och visar filen innan jag skapar den.

---

## Prompt 20 (30 okt 2026)

> Jag godkänner justeringarna och att du börjar med nästa steg
>
> 1. `notSupported` ska bara användas när den efterfrågade grundtjänsten saknas. Om ett tillägg inte erbjuds men grundtjänsten fungerar ska vi fortfarande kunna visa leveranstiden.
> 2. `rejected` behöver kunna skilja ogiltiga postnummer från andra avvisade anrop. Ett verifierat ogiltigt postnummer ska ge ett tydligt valideringsfel i kassan, inte behandlas som ett tillfälligt driftstopp. Vi ska fortfarande tillåta köp vid tekniska fel hos PostNord.
> 3. Lägg till ett test exakt vid bryttiden kl. 12.00, utöver testerna före och efter. Säkerställ också att tidsberäkningen fungerar korrekt vid övergång mellan sommartid och vintertid.
>
> I övrigt är jag nöjd med planen.

### Svar

**Dina tre punkter**

1. **`notSupported` bara när grundtjänsten saknas.** Så blir det. Adaptern frågar aldrig efter tillägg, och urvalet letar bara efter grundtjänsten. Finns grundtjänsten blir utfallet `estimate`, oavsett vilka tillägg som saknas.
2. **Ogiltigt postnummer får ett eget utfall, `invalidPostalCode`.** Det avgörs av PostNords strukturerade fält, inte av texten: felkod 400 där `compositeFault.faults` pekar ut parametern `destinationPostCode` med `faultCode` "API-009", som i steg A. Kassan visar då ett fel under postnummerfältet, till exempel "Postnumret finns inte. Kontrollera det.", och ordern kan inte skickas förrän det är rättat. Alla andra avvisningar blir `rejected`, och tekniska fel blir `unavailable`. I de fallen går köpet igenom som vanligt.
3. **Bryttiden och sommar- och vintertid.** Testet exakt kl. 12.00 finns med, både på vintertid och sommartid, och de svenska klockslagen kontrolleras på båda sidor av bytena i mars och oktober. Se resultatet nedan. De blir riktiga tester i steg F.

**Steg C: klart**

Ny fil `server/lib/handoverTime.ts` med `nextHandoverTime(now)`:

- Svensk tid läses med `Intl` och tidszonen `Europe/Stockholm`, oavsett vilken tidszon servern går i. Vercel går på UTC.
- Datumräkningen görs på kalenderdatumet, inte på klockslag, så att sommar- och vintertid inte kan flytta dagen.
- Före bryttiden blir det samma vardag, annars nästa vardag. Exakt på bryttiden räknas som efter. Lördag och söndag blir måndag.
- Svaret är svensk lokal tid utan tidszon, till exempel `2026-11-02T14:00:00`, i samma format som PostNords `startTime`.
- Bryttid och överlämning läses från `SHIPPING_CUTOFF_HOUR` och `SHIPPING_HANDOVER_HOUR`. Saknas de, eller är de inte hela timmar mellan 0 och 23, gäller 12 och 14.
- Svenska helgdagar hanteras inte än. Det står överst i filen.

`.env.example` har fått de två raderna. De behövs inte i din `.env` eller på Vercel så länge 12 och 14 gäller.

**Kontroll av tolv tidpunkter**

Typkontrollen gick igenom, och alla tolv gav rätt svar. Tiderna nedan är svensk tid:

| Beställning                                   | Överlämning       |
| --------------------------------------------- | ----------------- |
| mån 2 nov 11.59 (vintertid)                   | mån 2 nov 14.00   |
| mån 2 nov 12.00, exakt bryttid                | tis 3 nov 14.00   |
| mån 2 nov 12.01                               | tis 3 nov 14.00   |
| fre 30 okt 12.30                              | mån 2 nov 14.00   |
| lör 31 okt 10.00                              | mån 2 nov 14.00   |
| sön 1 nov 23.30                               | mån 2 nov 14.00   |
| fre 23 okt 11.59 (sommartid)                  | fre 23 okt 14.00  |
| fre 23 okt 12.00, helgen då vintertid börjar  | mån 26 okt 14.00  |
| sön 25 okt 02.30, direkt efter bytet          | mån 26 okt 14.00  |
| fre 27 mars 12.00, helgen då sommartid börjar | mån 30 mars 14.00 |
| mån 30 mars 11.59 (sommartid)                 | mån 30 mars 14.00 |
| mån 30 mars 12.00 (sommartid)                 | tis 31 mars 14.00 |

Raderna med exakt 12.00 på sommartid visar att bryttiden följer svensk tid: 12.00 sommartid är 10.00 i UTC, och då räknas beställningen redan som efter bryttiden.

**Steg D: det jag vill ändra i `server/integrations/shippingCarrier.ts`**

```ts
export type DeliveryRequest = {
  fromPostalCode: string
  toPostalCode: string
  handoverTime: string
  delivery: 'home' | 'servicePoint'
  servicePointId?: string
}

export type DeliveryEstimateResult =
  | { status: 'estimate'; date: string }
  | { status: 'notSupported'; reason: string }
  | { status: 'invalidServicePoint'; reason: string }
  | { status: 'invalidPostalCode'; reason: string }
  | { status: 'rejected'; reason: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'invalidResponse'; reason: string }

export type ServicePointsResult =
  | { status: 'found'; servicePoints: ServicePoint[] }
  | { status: 'invalidPostalCode'; reason: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'invalidResponse'; reason: string }
```

- `estimateDelivery(request)` returnerar `DeliveryEstimateResult` i stället för att kasta fel.
- **Ombudssökningen behöver samma skillnad.** Annars faller ett ogiltigt postnummer tillbaka på "Väntar", som om PostNord vore nere. `findServicePoints(postalCode)` returnerar därför `ServicePointsResult`. Hur ombudssökningen svarar på ett postnummer som inte finns vet vi inte än, så det testar jag först i steg E, med ett kommando som jag visar innan det körs.
- `DeliveryEstimate` tas bort, eftersom datumet nu ligger i `estimate`.

Efter steg D visar typkontrollen fel i `postnordAdapter.ts` tills steg E är klart. Det är väntat.

Godkänner du steg D?

---

## Prompt 21 (30 okt 2026)

> Det låter bra men jag vill att vi skiljer mellan ett giltigt svar utan några tillgängliga ombud och ett verifierat ogiltigt postnummer.
>
> invalidPostalCode får bara användas när PostNord uttryckligen bekräftar att postnumret är ogiltigt. Ett tomt resultat får inte automatiskt tolkas som ett ogiltigt postnummer.
>
> Fortsätt

### Svar

**Steg D: klart**

`server/integrations/shippingCarrier.ts` har ändrats så här:

- **`ServicePointsResult`** har fått utfallet `noServicePoints`: PostNord svarade som det ska, men listan var tom. `invalidPostalCode` används bara när PostNord uttryckligen säger att postnumret inte finns, och det står i en kommentar ovanför typen. Jag lade också till `rejected`, för andra avvisade anrop, så att ombudssökningen har samma utfall som leveranstiden.

  ```ts
  export type ServicePointsResult =
    | { status: 'found'; servicePoints: ServicePoint[] }
    | { status: 'noServicePoints'; reason: string }
    | { status: 'invalidPostalCode'; reason: string }
    | { status: 'rejected'; reason: string }
    | { status: 'unavailable'; reason: string }
    | { status: 'invalidResponse'; reason: string }
  ```

- **`DeliveryRequest`** och **`DeliveryEstimateResult`** ser ut som i förra svaret, med de sju utfallen.
- **`ShippingCarrier`**: `findServicePoints(postalCode)` returnerar `ServicePointsResult`, och `estimateDelivery(request)` returnerar `DeliveryEstimateResult`. Ingen av dem kastar fel längre.
- `DeliveryEstimate` är borttagen.

Typkontrollen visar nu fel i `postnordAdapter.ts`, eftersom adaptern fortfarande följer det gamla gränssnittet. Det rättas i steg E.

**Steg E: det jag vill göra i `server/integrations/postnordAdapter.ts`**

1. **En egen hjälpfunktion för PostNord-anrop.** Den använder `fetch` med en timeout på 5 sekunder, lägger nyckeln i adressen enligt dokumentationen, och läser svaret både när anropet lyckas och när PostNord svarar med en felkod. Den skiljer på tre fall: lyckat svar, felkod med innehåll, och inget svar alls (timeout eller nätverksfel). Inga omförsök. `fetchJson.ts` rörs inte.
2. **Maskering.** Alla texter som lämnar adaptern går genom maskeringen av nyckeln, även om de inte ska innehålla någon adress.
3. **Ogiltigt postnummer avgörs av PostNords strukturerade fält,** felkod 400 och `compositeFault.faults` med parametern för postnumret, aldrig av en tom lista eller av texten.
4. **Ombudssökningen** returnerar `ServicePointsResult`. Ombud och paketboxar hämtas fortfarande i två anrop. Svarar något av dem med ett tekniskt fel blir utfallet `unavailable`. Är båda listorna tomma blir det `noServicePoints`.
5. **Leveranstiden** returnerar `DeliveryEstimateResult`, med `v1` `/addresstoaddress` och `/addresstolocation`, och bara postnummer. Varje rad kontrolleras mot ett schema för lyckad rad och ett för felrad. En rad som inte passar något av dem gör svaret till `invalidResponse`. Urvalet av grundtjänsten är som i planen: rätt `serviceCode`, inga tillägg, tidigast `timeOfArrival`, och vid lika den som kommer först.
6. Den gissade koden (`getTransitTimeInformation.json`) tas bort.

**Det jag behöver veta först**

Hur svarar ombudssökningen när postnumret inte finns? Leveranstiden säger det med `faultCode` "API-009" och parametern `destinationPostCode`, men ombudssökningen lägger sina fel på ett annat ställe (`servicePointInformationResponse.compositeFault`, enligt testet med fel `typeId` tidigare). Jag har förberett ett skript i min tillfälliga mapp som söker ombud och paketboxar för 00000, med samma skydd för nyckeln som i steg A. Det här är det exakta kommandot:

```
cd "D:/Fullstack developer/6. Systemutveckling/fsu25d-systemutveckling-uppgift-1-min-egna-e-handel-csschef" && node --env-file=.env node_modules/tsx/dist/cli.mjs "<min tillfälliga mapp>/stepE-probe.mts" < /dev/null
```

En fråga till steg 10, inget beslut behövs nu: om ombudssökningen ger `noServicePoints`, ska kassan då bara erbjuda hemleverans, eller ombud med ombud som väljs i efterhand, som när PostNord inte svarar?

Godkänner du steg E och kommandot?

---

## Prompt 22 (30 okt 2026)

> Jag vill se hela stepE-probe.mts inklusive vilka miljövariabler som läses.
>
> Två API-anrop ska inte behöva förstöra varandras resultat. Om ombudssökningen lyckas men paketboxsökningen misslyckas bör ni överväga att använda de ombud som faktiskt hittades. Det är bättre än att kasta bort fungerande data.
>
> Kontrollera att invalidResponse inte orsakas av irrelevanta extrafält. PostNord kan lägga till fält i sina svar. Zod ska acceptera sådana tillägg men reagera när obligatoriska fält saknas eller har fel typ.
>
> Om PostNord svarar korrekt men inga ombud hittas ska vi i första hand erbjuda hemleverans, förutsatt att den är tillgänglig.
>
> Om PostNord däremot inte svarar behåller vi vår tidigare fallback med manuell ombudstilldelning.

### Svar

Inget är kört och ingen kod är ändrad sedan förra svaret.

**Hela `stepE-probe.mts`**

```ts
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Nyckeln läses från miljön som node --env-file laddar. Den skrivs aldrig ut och sparas aldrig.
const apiKey = process.env.POSTNORD_API_KEY ?? ''
const baseUrl = process.env.POSTNORD_API_URL ?? ''
if (!apiKey || !baseUrl)
  throw new Error('POSTNORD_API_KEY eller POSTNORD_API_URL saknas')
const mask = (text: string) => text.replaceAll(apiKey, '***')

const outDir = join(import.meta.dirname, 'stepE')
mkdirSync(outDir, { recursive: true })

async function probe(file: string, label: string, typeId: string) {
  const url = new URL(
    `${baseUrl}/rest/businesslocation/v5/servicepoints/nearest/byaddress`,
  )
  url.searchParams.set('returnType', 'json')
  url.searchParams.set('countryCode', 'SE')
  url.searchParams.set('postalCode', '00000')
  url.searchParams.set('numberOfServicePoints', '5')
  url.searchParams.set('context', 'optionalservicepoint')
  url.searchParams.set('typeId', typeId)
  // Parametrarna skrivs ut innan nyckeln läggs till
  console.log(
    `\n### ${label}\nnearest/byaddress?${url.searchParams.toString()}`,
  )
  url.searchParams.set('apikey', apiKey)

  let saved: unknown
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    const body = mask(await res.text())
    console.log(
      `${res.status} ${res.statusText}, ${res.headers.get('content-type')}`,
    )
    console.log(body.slice(0, 1500))
    saved = {
      status: res.status,
      contentType: res.headers.get('content-type'),
      body,
    }
  } catch (error) {
    const message = mask(
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error),
    )
    console.log(`Fel: ${message}`)
    saved = { error: message }
  }
  writeFileSync(join(outDir, file), JSON.stringify(saved, null, 2))
}

await probe(
  '1-ombud-00000.json',
  '1. Ombud, postnummer som inte finns (00000)',
  '24,25,54',
)
await probe(
  '2-paketbox-00000.json',
  '2. Paketbox, postnummer som inte finns (00000)',
  '2',
)

// Kontroll: nyckeln får inte finnas i någon sparad fil
const leaked = readdirSync(outDir).filter((file) =>
  readFileSync(join(outDir, file), 'utf8').includes(apiKey),
)
console.log(`\nSparade svar i ${outDir}`)
console.log(
  `Nyckeln i sparade svar: ${leaked.length === 0 ? 'nej' : `JA, i ${leaked.join(', ')}`}`,
)
```

**Miljövariabler**

- Skriptet läser två: `POSTNORD_API_KEY` och `POSTNORD_API_URL`.
- Men `node --env-file=.env` laddar **alla** rader i `.env` i processens miljö, även databasens, Stripes och Supabases nycklar. Skriptet rör dem inte och skriver inte ut dem, men de finns i processen medan den kör.
- Vill du ha det striktare kan PostNords två rader ligga i en egen fil, till exempel `.env.postnord`, som bara testskripten använder. Den ignoreras redan av git, eftersom `.gitignore` har `.env.*`. Men den finns inte i deny-listan i `.claude/settings.json`, så den behöver läggas till där innan den skapas. Filen skapar du själv, eftersom jag inte ska skriva nycklar.

**Två anrop som inte förstör varandra**

Du har rätt, det är bättre att använda det som fungerar. Ändring i steg D och E:

- Utfallet `found` får en lista över grupper som inte gick att hämta: `{ status: 'found'; servicePoints: ServicePoint[]; unavailableKinds: ServicePoint['kind'][] }`. Lyckas ombuden men inte paketboxarna visar kassan ombuden, och loggen säger varför paketboxarna saknas.
- Säger PostNord i något av anropen att postnumret inte finns blir utfallet `invalidPostalCode`, eftersom det gäller hela sökningen.
- Hittades inga platser alls, och något anrop misslyckades, avgör felet utfallet (till exempel `unavailable`). Bara när båda anropen lyckades och båda listorna var tomma blir det `noServicePoints`.
- **Kontrollen av kundens val vid ordern:** finns det valda id:t i listan är det godkänt. Finns det inte, och båda grupperna gick att hämta, avvisas valet. Finns det inte, men någon grupp saknas, går det inte att kontrollera, och ordern får "Väntar" i stället för att avvisas.

**Extra fält i PostNords svar**

`z.object` i Zod accepterar extra fält som standard och tar bort dem ur resultatet. Bara `z.strictObject` avvisar dem. Adapterns scheman använder `z.object`, och inga fält från PostNord kontrolleras mot en fast lista med tillåtna värden. Nya fält eller nya veckodagsnamn ger alltså inget fel. Saknas ett obligatoriskt fält, eller har det fel typ, misslyckas raden. Steg F får ett test med ett låtsat svar som har extra fält, och ett där ett obligatoriskt fält har fel typ.

Ett förtydligande om ombudssökningen: ett enstaka ombud som inte klarar schemat hoppas över, men det loggas med skälet, så det sker inte tyst. Klarar inget ombud i ett svar schemat blir gruppen `invalidResponse`. För leveranstiden gäller det som är bestämt: en rad som inte passar gör hela svaret till `invalidResponse`.

**Kassan när det inte finns några ombud**

- `noServicePoints` (PostNord svarade, men inga ombud hittades): kassan erbjuder i första hand hemleverans. Mitt förslag är att hemleverans räknas som tillgänglig så länge den finns i `shipping_methods`. Ett fel i leveranstiden får aldrig hindra köp, så leveranstiden avgör inte om hemleverans visas. Undantaget är om PostNord uttryckligen säger att hemleverans inte erbjuds till postnumret (`notSupported` för tjänst 17). Då återstår ombud med ombud som väljs i efterhand.
- `unavailable`, `rejected` eller `invalidResponse` (PostNord svarade inte, eller inte begripligt): oförändrat, ombud med ombud som väljs i efterhand ("Väntar").
- `invalidPostalCode`: felet under postnummerfältet, som bestämt.

Det här byggs i steg 7 och 10.

Godkänner du ändringarna ovan och kommandot, med `.env` som det står, eller vill du hellre skapa `.env.postnord` först?

---

## Prompt 23 (30 okt 2026)

> Jag godkänner ändringarna och skriptet. Jag skriver en .env.postnord först. Vänta in mitt svar att det är gjort

### Svar

Jag väntar och gör ingenting förrän du säger till.

Två saker inför det:

- Lägg till `.env.postnord` i deny-listan i `.claude/settings.json` innan filen skapas, till exempel `"Read(./.env.postnord)"` och `"Read(./**/.env.postnord)"`. Annars kan mitt läsverktyg öppna den.
- Filen behöver bara `POSTNORD_API_URL` och `POSTNORD_API_KEY`.

Kommandot blir då, i övrigt oförändrat:

```
cd "D:/Fullstack developer/6. Systemutveckling/fsu25d-systemutveckling-uppgift-1-min-egna-e-handel-csschef" && node --env-file=.env.postnord node_modules/tsx/dist/cli.mjs "<min tillfälliga mapp>/stepE-probe.mts" < /dev/null
```

---

## Prompt 24 (30 okt 2026)

> Klart.

### Svar

Jag kontrollerade först i `.claude/settings.json` att `.env.postnord` finns i deny-listan, utan att röra själva filen. Båda raderna fanns där. Sedan körde jag kommandot med `--env-file=.env.postnord`, så att bara PostNords två variabler laddades i processen.

**Resultat: ombudssökningen med postnummer 00000**

Både ombud (`typeId=24,25,54`) och paketboxar (`typeId=2`) svarade likadant:

```
400 Bad Request
{"servicePointInformationResponse":{"compositeFault":{"faults":[{"faultCode":"API-400","explanationText":"Postalcode not found"}]}}}
```

Nyckeln fanns inte i de sparade svaren.

**Vad det betyder**

- Felet ligger under `servicePointInformationResponse.compositeFault`, inte direkt i `compositeFault` som hos leveranstiden.
- Leveranstiden pekar ut parametern (`paramValues` med `destinationPostCode`) och har en egen felkod (API-009). Ombudssökningen har bara en allmän felkod, "API-400", som betyder 400, och ingen uppgift om parametern. Det enda som säger att det gäller postnumret är texten "Postalcode not found".
- PostNord bekräftar alltså uttryckligen att postnumret inte finns, men i ombudssökningen bara i text.

**Rekommendation**

- **Leveranstiden:** `invalidPostalCode` när svaret är 400 och ett fel pekar ut parametern `destinationPostCode`. Helt strukturerat.
- **Ombudssökningen:** `invalidPostalCode` när svaret är 400, felkoden är "API-400" och texten är exakt "Postalcode not found", utan hänsyn till stora och små bokstäver. Det är en jämförelse med text, och det står som en begränsning i dokumentationen.
- Varför det är godtagbart: om PostNord ändrar texten blir utfallet `rejected` i stället. Det faller alltså åt det säkra hållet, kunden kan fortfarande köpa och ombud väljs i efterhand. Jämförelsen kan bara slå till när PostNord själv skriver att postnumret inte finns.
- Ett tomt svar blir aldrig `invalidPostalCode`, som du bestämde.

**Steg D, tillägget du godkände**

`ServicePointsResult` har fått `unavailableKinds` på utfallet `found`:

```ts
| { status: 'found'; servicePoints: ServicePoint[]; unavailableKinds: ServicePoint['kind'][] }
```

Ska jag skriva steg E med den här rekommendationen?

---

## Prompt 25 (30 okt 2026)

> Jag godkänner steg E och din rekommendation för identifiering av ogiltiga postnummer.
>
> Använd den verifierade kombinationen HTTP 400, `API-400` och feltexten `Postalcode not found` för ombudssökningen. Jämför texten skiftlägesokänsligt och använd `trim()`.
>
> Dokumentera att detta är en begränsning i PostNords API och att identifieringen bygger på feltext eftersom strukturerad parameterinformation saknas.
>
> Jag vill dock förtydliga hanteringen av `rejected`.
>
> Ett okänt HTTP 400-fel ska inte automatiskt behandlas som ett tillfälligt driftstopp. Det kan indikera felaktiga indata eller en bugg i integrationen.
>
> Behåll `rejected` som ett separat utfall och se till att kassan inte automatiskt betraktar adressen som verifierad när PostNord har avvisat begäran.
>
> Tekniska fel som timeout och HTTP 5xx ska däremot fortfarande använda vår tidigare fallback.
>
> I övrigt:
>
> - Behåll fungerande ombud vid partiella fel.
> - Undvik dubbletter i `unavailableKinds`.
> - Behåll maskering av API-nyckeln.
> - Exponera inte råa felmeddelanden från PostNord för klienten.
> - Lägg till tester för felklassificeringen i steg F.
>
> Genomför steg E och redovisa ändringarna samt resultatet av typkontrollen innan vi går vidare.

### Svar

**Steg E: klart**

`server/integrations/postnordAdapter.ts` är omskriven. `server/lib/fetchJson.ts` är inte ändrad.

**1. Egen hjälpfunktion för PostNord, `requestPostNord`**

- Använder `fetch` med timeout på 5 sekunder och inga omförsök.
- Lägger nyckeln i adressen, som dokumentationen säger, men adressen skrivs aldrig i något meddelande.
- Läser svaret både vid lyckat anrop och vid felkod, och ger ett av tre svar: lyckat, felkod med innehåll, eller inget svar (timeout, nätverksfel eller saknade miljövariabler).
- Ett svar som inte är JSON blir `null`, och schemat säger då att formatet är oväntat.

**2. Klassificering av felkoder, `httpFailure`**

- `invalidPostalCode` när PostNord uttryckligen säger att postnumret inte finns, se punkt 3.
- `unavailable` vid 5xx, 408 (timeout hos PostNord) och 429 (för många anrop). Det är tillfälliga fel, och den tidigare reservlösningen gäller.
- `rejected` vid alla andra 4xx. En kommentar i koden säger att det kan vara fel indata eller en bugg i integrationen, inte ett driftstopp.

**3. Ogiltigt postnummer**

- **Ombudssökningen:** felkod 400, `faultCode` "API-400" och `explanationText` som efter `trim()` och små bokstäver är exakt "postalcode not found". En kommentar i koden säger att ombudssökningen inte pekar ut parametern, och att bara texten visar att det gäller postnumret.
- **Leveranstiden:** felkod 400, `faultCode` "API-009" och `paramValues` med `destinationPostCode`. Helt strukturerat.
- Ett tomt svar blir aldrig `invalidPostalCode`.
- Felsvaren ligger på olika ställen i de två API:erna, så det finns ett schema för var: `compositeFault` direkt för leveranstiden, och `servicePointInformationResponse.compositeFault` för ombuden.

**4. Ombudssökningen, `findServicePoints`**

- Ombud och paketboxar hämtas samtidigt med `Promise.all`, i två anrop.
- Ett fel i den ena gruppen tar inte bort platserna från den andra. Finns det platser blir utfallet `found`, och grupper som saknas står i `unavailableKinds`. Skälen loggas på servern, eftersom kassan bara får veta vilka grupper som saknas.
- `unavailableKinds` byggs med en `Set`, så samma grupp kan inte stå två gånger.
- Säger PostNord i något av anropen att postnumret inte finns blir utfallet `invalidPostalCode` för hela sökningen.
- Lyckades båda anropen men listorna var tomma blir det `noServicePoints`. Fanns inga platser och något anrop misslyckades, avgör felet utfallet. Ombudens fel går före paketboxarnas, och alla skäl följer med.
- En enskild plats som inte klarar schemat hoppas över och loggas med skälet. Klarar ingen plats i ett svar schemat blir gruppen `invalidResponse`.

**5. Leveranstiden, `estimateDelivery`**

- Tjänstekod 17 för hemleverans och 19 för ombud och paketbox.
- Med ett valt ombud går anropet till `v1` `/addresstolocation` med ombudets id. Annars går det till `v1` `/addresstoaddress` med bara postnumret. En kommentar säger att dokumentationen kräver gata och nummer, men att API:t svarar likadant utan.
- `startTime` kommer från `nextHandoverTime` via `handoverTime` i anropet.
- Varje rad kontrolleras mot schemat för lyckad rad och schemat för felrad. En rad som inte passar något av dem gör svaret till `invalidResponse`.
- Bara grundtjänsten räknas: rätt `serviceCode` och inga tillägg. Finns grundtjänsten blir det `estimate`, oavsett vilka tillägg som saknas. Av flera grundtjänstrader väljs den med tidigast `timeOfArrival`. Är två lika ger de samma datum.
- Inga grundtjänstrader: felrader från `/addresstolocation` ger `invalidServicePoint`, felrader från `/addresstoaddress` ger `notSupported` med PostNords förklaring, och inga rader alls ger `notSupported`.

**6. Skydd för nyckeln och för kunden**

- Alla skäl som lämnar adaptern, och alla varningar den loggar, går genom `mask()`, som byter ut nyckeln mot `***`. Det gäller även texter som inte ska innehålla någon adress.
- `shippingCarrier.ts` har fått en kommentar om att skälet är för serverns logg och aldrig visas för kunden. Routen i steg 7 översätter utfallen till kassans egna texter, så att PostNords råa felmeddelanden aldrig når webbläsaren.

**7. Zod och extra fält**

Alla scheman använder `z.object`, som accepterar extra fält. Inga fält från PostNord jämförs med en fast lista av tillåtna värden. Steg F testar både extra fält och obligatoriska fält med fel typ.

**Typkontroll**

`npx tsc -p tsconfig.api.json --noEmit` gav inga fel. En sökning efter långa streck och pilar i `server/` gav inga träffar.

**Inte gjort än**

Adaptern har inte körts mot sandlådan sedan omskrivningen. Det görs i steg F, tillsammans med testerna för felklassificeringen.

**Att bestämma i steg 7, om `rejected`**

Mitt förslag, så att adressen inte räknas som verifierad: vid `rejected` går köpet igenom, men ordern får ombudsstatus "Väntar" och felet loggas som ett integrationsfel, inte som att PostNord är nere. Vid hemleverans markeras ingenting, eftersom adressen inte kontrolleras mot PostNord då. Det tar vi ställning till när routen byggs.

Godkänner du steg F?

---

## Prompt 26 (30 okt 2026)

> Jag körde hela postnordAdapter mot en annan ai agent för att verifiera det du skrivit och följande är svaret:
>
> Jag godkänner steg F.
>
> Typkontrollen är godkänd, och vi går nu vidare med testerna.
>
> Jag vill att du inkluderar tester för de tre punkter som fortfarande finns i kodversionen:
>
> 1. Timeout eller avbruten anslutning under `response.json()` ska ge `unavailable`, inte `invalidResponse`.
> 2. Ogiltiga kalenderdatum och felaktiga tidssträngar ska inte kunna bli leveransprognoser.
> 3. Ett fel från `addresstolocation` ska bara klassificeras som `invalidServicePoint` när det uttryckligen gäller ett ogiltigt ombuds-ID. Andra fel ska inte automatiskt få den klassificeringen.
>
> Korrigera implementationen där testerna visar att det behövs.
>
> Jag godkänner också principen för `rejected` i steg 7: kunden ska kunna fortsätta med manuell ombudstilldelning, förutsatt att kunden tydligt informeras om att leveransalternativet inte har kunnat verifieras. Det ska loggas som ett integrationsfel och inte som ett vanligt driftstopp.
>
> För steg F vill jag att du:
>
> - Använder mockad `fetch` för att testa både lyckade svar och fel.
> - Testar partiella resultat, ogiltiga postnummer, timeout, 4xx, 5xx och oväntade svar.
> - Testar att API-nyckeln inte förekommer i loggar eller felmeddelanden.
> - Kör typkontrollen och redovisar testresultaten.
> - Inte ändrar kassans routes, Stripe eller databasen ännu.
>
> Visa testresultaten och eventuella kvarstående problem innan vi går vidare till steg 7.

### Svar

Kassans routes, Stripe och databasen är inte ändrade.

**Hur jag gick till väga**

Jag skrev testerna först och körde dem mot koden som den var. Då syns det om de tre punkterna verkligen var fel, innan något rättas. Alla kommandon visades innan de kördes. Testerna läser ingen `.env` och använder en påhittad nyckel.

**Nya filer och ändringar**

- `server/lib/handoverTime.test.ts`: 14 tester för överlämningstiden.
- `server/integrations/postnordAdapter.test.ts`: 42 tester för adaptern, med en låtsad `fetch` via `mock.method` i Nodes inbyggda testkörare. Svaren är förenklade kopior av riktiga svar från sandlådan.
- `package.json`: skriptet `"test": "tsx --test \"server/**/*.test.ts\""`. Inget nytt paket.

**Första körningen: 9 av 56 tester fallerade, precis de tre punkterna**

1. Avbruten anslutning medan svaret lästes gav `invalidResponse` (2 tester). Orsak: `response.json().catch(() => null)` skilde inte på en bruten anslutning och ett svar som inte är JSON.
2. Ogiltiga tider blev leveranstider (6 tester), till exempel "2026-02-30T18:00:00" och "2026-11-02T25:00:00". Orsak: mönstret kontrollerade bara början av texten.
3. Ett annat fel från `addresstolocation` blev `invalidServicePoint` (1 test). Orsak: alla felrader från den endpointen räknades som ogiltigt ombud.

**Rättningar i `postnordAdapter.ts`**

1. Svaret läses som text inuti samma `try` som anropet, så att timeouten gäller också medan svaret läses. Bryts läsningen blir det "inget svar", alltså `unavailable`. Först därefter tolkas texten som JSON, och misslyckas det blir det `invalidResponse`.
2. `timeOfArrival` måste ha formen `2026-11-03T18:00:00`, och datumet måste finnas. Kontrollen räknar fram datumet med `Date.UTC` och jämför med texten. 30 februari blir 2 mars och stämmer då inte.
3. `invalidServicePoint` ges bara när en felrad uttryckligen säger att just det valda ombudets id inte finns: texten "Requested destination location '...' not found" där platsen börjar med ombudets id. Andra felrader ger `notSupported`. Det är en jämförelse med text, eftersom `v1` saknar felkoder på raderna. Ändras texten blir det `notSupported`, kunden kan fortfarande köpa, och ombudets id kontrolleras ändå mot ombudssökningen när ordern skapas.

**Andra körningen: 2 tester fallerade, och felet var mitt**

För "2026-11-02Tkväll" och "2026-11-02T18:00" blev datumet ogiltigt, och då kastade `toISOString()` ett `RangeError` i stället för att returnera `false`. Zod kör en `refine` även när mönstret före den redan har sagt nej, så felet kastades ut ur `safeParse`. Rättning: kontrollen kräver själv rätt form innan den räknar, och mönstret före den är borttaget.

**Tredje körningen: 56 av 56 godkända, och typkontrollen utan fel**

Testerna täcker:

- Ombudssökning: lyckat svar i butikens format, extra fält, partiellt resultat (paketboxar 503 och ombud med timeout), ogiltigt postnummer (även med versaler och mellanslag), annat 400-fel, 403, 502, två tomma listor, fel form, fält med fel typ, avbruten läsning.
- Leveranstid: hemleverans (17), ombud utan valt ombud (19), valt ombud och vald paketbox (`addresstolocation`), saknat tillägg med fungerande grundtjänst, bara varianter, flera grundtjänstrader, extra fält, ogiltigt ombuds-id, annat fel från `addresstolocation`, felrad från `addresstoaddress`, ogiltigt postnummer, annat 400-fel, 502 och 429, timeout, avbruten läsning, svar som inte är JSON, fel form, fält med fel typ, sex ogiltiga tider, saknade miljövariabler.
- Nyckeln: finns aldrig i skäl eller loggar, inte ens när ett låtsat felsvar från PostNord innehåller den. Där syns `***` i stället.
- Överlämningstiden: före, exakt på och efter bryttiden, fredag, lördag, söndag, båda bytena mellan sommar- och vintertid, årsskiftet, och värden från miljön.

**Kontroll mot sandlådan**

Testerna använder bara låtsade svar, så jag körde också den omskrivna adaptern mot sandlådan, med ett skript utanför repot och bara `.env.postnord` laddad. Överlämningen blev fredag 30 oktober kl. 14.00, eftersom körningen gjordes före kl. 12.

| Anrop                          | Utfall                | Detalj                                     |
| ------------------------------ | --------------------- | ------------------------------------------ |
| Ombudssökning 393 65           | `found`               | 5 ombud, 5 paketboxar, inget saknas        |
| Ombudssökning 00000            | `invalidPostalCode`   | API-400 Postalcode not found               |
| Hemleverans till 111 51        | `estimate`            | 2026-11-02                                 |
| Ombud till 111 51, inget valt  | `estimate`            | 2026-11-02                                 |
| Ombud Ica Lindsdal (331366)    | `estimate`            | 2026-11-02                                 |
| Paketbox Lassevägen (2696390)  | `estimate`            | 2026-11-02                                 |
| Ogiltigt ombuds-id (999999999) | `invalidServicePoint` | location not found                         |
| Hemleverans till 00000         | `invalidPostalCode`   | API-009 Postal code '00000' does not exist |

**Kvarstående problem och begränsningar**

- Svenska helgdagar hanteras inte i överlämningstiden. Nyårsdagen räknas till exempel som vardag, och ett test visar det.
- Två klassificeringar bygger på PostNords feltext, eftersom strukturerad information saknas: ogiltigt postnummer i ombudssökningen och ogiltigt ombuds-id i leveranstiden. Båda faller åt det säkra hållet om texten ändras.
- Tidsformatet är strikt. Skulle PostNord börja skicka tidszon eller millisekunder blir det `invalidResponse`, och kassan visar då ingen leveranstid tills adaptern har anpassats.
- Testerna körs lokalt med `npm test`. Vercel kör dem inte, eftersom Vercel bara kör `vite build`.
- Steg G, dokumentet med avvikelser och felaktiga antaganden, är inte skrivet än.

**Principen för `rejected` i steg 7, som du godkände**

Kunden kan fortsätta med ombud som väljs i efterhand, men kassan säger tydligt att leveransalternativet inte kunde kontrolleras. Felet loggas som ett integrationsfel, inte som ett driftstopp.

**Läge för commit**

Ändrade eller nya filer sedan labben började, inget är committat: `server/integrations/shippingCarrier.ts`, `server/integrations/postnordAdapter.ts`, `server/integrations/postnordAdapter.test.ts`, `server/lib/handoverTime.ts`, `server/lib/handoverTime.test.ts`, `package.json`, `.env.example` och `docs/ai-logg-labb5.md`.

Nästa steg är G, dokumentet `docs/postnord-avvikelser.md`, och sedan steg 6 och 7 i huvudplanen. Godkänner du steg G?

---

## Prompt 27 (30 okt 2026)

> Bra att testerna faktiskt upptäckte fel i implementationen och att dessa kunde korrigeras innan vi gick vidare.
>
> Skriv docs/postnord-avvikelser.md med fokus på:
>
> Vilka antaganden vi gjorde om PostNords API.
>
> Vilka antaganden som visade sig vara felaktiga.
>
> Vad de verkliga API-svaren visade.
>
> Hur vi anpassade implementationen.
>
> Vilka begränsningar som fortfarande finns kvar.
>
> Hur testerna hjälpte oss att upptäcka och korrigera brister.
>
> Skilj tydligt mellan sådant vi verifierat mot PostNords sandbox och sådant vi bara verifierat genom mockade tester.
>
> Dokumentet ska vara sakligt, begripligt och användbart för laborationens redovisning. Undvik att göra det onödigt omfattande.
>
> Ändra ingen kod i steg G.
>
> När dokumentet är klart vill jag ha en kort sammanfattning och därefter en översikt över vad som återstår innan hela PostNord-integrationen fungerar i kassan.

### Svar

Skrivet för: den som rättar och lyssnar på redovisningen av labb 5. Dokumentet är också underlag till README.

**Steg G: klart**

`docs/postnord-avvikelser.md` är skriven. Ingen kod är ändrad.

**Kort sammanfattning**

- Dokumentet har en tabell för varje API, med antagande, vad som visade sig, anpassning och om det är verifierat i sandlådan eller med mock.
- Avvikelser i PostNords egen dokumentation: versionen står inte, exemplet för Address to Location pekar på fel endpoint, latitud och longitud har bytt plats, listan med ombudstyper ger 400 för Sverige, gata och nummer är markerade som obligatoriska men behövs inte, och svarsexempel saknas.
- Antaganden som var fel i AI:ns första version: endpointen för leveranstid (502), att sökningen bara ger bemannade ombud, att svaret är ett objekt, att fel alltid ger en felkod, och att `startTime` kan vara tiden för beställningen.
- Testerna hittade tre brister, och en fjärde i en av rättningarna. Efter det gick alla 56 tester igenom.
- Ett eget avsnitt skiljer på det som är verifierat mot sandlådan och det som bara är verifierat med mock, och ett avsnitt listar begränsningarna som finns kvar.

**Det som återstår innan PostNord-integrationen fungerar i kassan**

Adaptern är klar och testad, men ingen route använder den än. Det som återstår är huvudplanens steg 6 till 14:

6. **Databasen:** tabellen `shipping_methods` med ombud (69 kr, fri frakt från 399 kr) och hemleverans (139 kr, fri frakt från 499 kr), startvärden i `db/seed.sql`, och en funktion som räknar fraktpriset utifrån varukorgen.
7. **Route för kassan:** postnummer in, och fraktalternativ med pris, ombud och paketboxar och leveranstid ut. Utfallen blir kassans egna texter:
   - Ogiltigt postnummer: fel under postnummerfältet.
   - Ingen leveranstid: "Beräknad leveranstid är tillfälligt otillgänglig."
   - Inga ombud: hemleverans i första hand.
   - PostNord svarar inte: ombud som väljs i efterhand.
   - Avvisat anrop: samma sak, med en text om att alternativet inte kunde kontrolleras, och ett integrationsfel i loggen.
8. **Kolumner på `orders`:** fraktalternativ, dess namn och pris, ombudets id, landskod och namn, och ombudsstatus ("Vald" eller "Väntar").
9. **Ordern och Stripe:** servern kontrollerar valt ombud mot ombudssökningen, räknar priset, sparar allt på ordern och lägger frakten som en egen rad i Stripe.
10. **Kassan i React:** fraktval, en egen ombudsväljare med grupperna ombud och paketbox, öppettider och "Visa på karta", leveranstiden som uppskattning, och "Vi skickar bara inom Sverige".
11. **Admin och tacksidan:** frakten på ordern, markering av "Väntar" och knappen "Hämta ombud".
12. **Adminsida för fraktpriserna.**
13. **Produktion:** `POSTNORD_API_URL` och `POSTNORD_API_KEY` på Vercel, databasändringarna i produktion, deploy och "Klart när" i den deployade butiken.
14. **README:** avsnittet om AI, med underlag från loggen och avvikelsedokumentet.

Det här är också ett bra läge för en commit. Utöver filerna från förra svaret har `docs/postnord-avvikelser.md` tillkommit.

Godkänner du att vi börjar med steg 6?

---

## Prompt 28 (30 okt 2026)

> Ja kör vidare

### Svar

**Steg 6: fraktpriser i databasen, koden klar**

Inga routes, ingen Stripe-kod och ingen kassa är ändrad, och inget är kört mot databasen.

- **`db/schema.sql`:** tabellen `shipping_methods` med `code` (`ombud` eller `hem`, som primärnyckel), `name`, `price` och `free_from`. Priset får inte vara negativt, och `free_from` får vara tomt, vilket betyder ingen fri frakt. Koden är låst till de två värdena, eftersom programmet bara vet hur de två ska levereras. Ett nytt fraktsätt kräver alltså både en ny rad och ny kod.
- **`db/seed.sql`:** startvärdena, "Ombud eller paketbox" för 69 kr med fri frakt från 399 kr, och "Hemleverans" för 139 kr med fri frakt från 499 kr.
- **`server/lib/shippingPrice.ts` (ny):** `calculateShipping(method, cartTotal)` räknar priset för ett fraktalternativ. Fri frakt gäller från och med gränsen. Beräkningen sker i hela ören, så att avrundning i decimaltal inte kan flytta gränsen. Svaret innehåller också `amountToFreeShipping`, alltså hur mycket som fattas till fri frakt, så att kassan kan visa till exempel "Handla för 90 kr till för fri frakt". Filen använder ingen databas, så den går att testa.
- **`server/lib/shippingMethods.ts` (ny):** hämtar alternativen ur tabellen, sorterade på pris, och räknar priset för varukorgens summa.
- **`server/lib/cart.ts`:** `getCartTotal(cartId)` räknar varukorgens summa med dagens priser i databasen, aldrig med priser från webbläsaren.
- **`server/lib/shippingPrice.test.ts` (ny):** 8 tester: under gränsen, exakt på gränsen, en krona under, över, hemleveransens egen gräns, utan gräns, decimaler och tom varukorg.

**Resultat:** typkontrollen utan fel, och 64 av 64 tester godkända.

**Databasen**

Tabellen finns inte i databasen än. Databasen delas mellan lokal utveckling och den deployade butiken, men den deployade koden använder inte tabellen, så den påverkas inte. Det här ska köras:

```sql
CREATE TABLE shipping_methods (
  code TEXT PRIMARY KEY CHECK (code IN ('ombud', 'hem')),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  free_from NUMERIC(10,2) CHECK (free_from > 0)
);

INSERT INTO shipping_methods (code, name, price, free_from)
VALUES
  ('ombud', 'Ombud eller paketbox', 69.00, 399.00),
  ('hem', 'Hemleverans', 139.00, 499.00);
```

Mitt förslag är att du kör det i SQL-editorn i Supabase och kontrollerar med `SELECT * FROM shipping_methods;`. Då behöver jag aldrig ladda `DATABASE_URL`. Alternativet är att jag kör det med ett skript, men det kräver att databasens adress laddas i processen, på samma sätt som PostNords nycklar i `.env.postnord`. Varnar Supabase för att tabellen saknar RLS räcker det att Data API är avstängt i projektet, eftersom butiken bara når databasen via servern.

Säg till när tabellen finns, så går vi vidare till steg 7, routen för kassan.

---

## Prompt 29 (30 okt 2026)

> SQL:en är körd.

### Svar

Bra. Här är förslaget för steg 7. Ingen kod är skriven än.

**Filer**

- `server/lib/shippingQuote.ts` (ny): en funktion som översätter adapterns utfall till svaret till kassan och avgör vad som ska loggas. Den gör inga anrop och använder ingen databas, så den går att testa.
- `server/routes/shipping.ts` (ny): två endpoints, se nedan.
- `server/app.ts`: `app.use('/api/shipping', shippingRouter)`, efter `/api/search`.
- `server/lib/shippingQuote.test.ts` (ny): tester för översättningen.
- `.env.example`: `SHOP_POSTAL_CODE=39365`. Koden använder 39365 om variabeln saknas, så Vercel behöver ingen ny variabel.

**Endpoint 1: `GET /api/shipping/options?postalCode=39365`**

1. Postnumret kontrolleras med Zod: fem siffror, mellanslag tillåtet. Annars 400.
2. Varukorgens summa räknas på servern, från sessionens varukorg.
3. Samtidigt hämtas fraktalternativen ur databasen, ombud och paketboxar, och leveranstiden för hemleverans (17) och för ombud till postnumret (19).
4. Svaret:

   ```json
   {
     "options": [
       {
         "code": "ombud",
         "name": "Ombud eller paketbox",
         "price": 69,
         "regularPrice": 69,
         "freeFrom": 399,
         "amountToFreeShipping": 90,
         "estimatedDelivery": "2026-11-02"
       },
       {
         "code": "hem",
         "name": "Hemleverans",
         "price": 139,
         "regularPrice": 139,
         "freeFrom": 499,
         "amountToFreeShipping": 190,
         "estimatedDelivery": null
       }
     ],
     "servicePoints": [],
     "servicePointStatus": "found",
     "unavailableKinds": []
   }
   ```

`servicePoints` är ombud och paketboxar i butikens format. `servicePointStatus` styr kassan:

- `found`: kunden väljer ombud eller paketbox. Saknas en grupp står den i `unavailableKinds`, och kassan kan säga till exempel "Paketboxar kan inte visas just nu".
- `none`: PostNord svarade men hittade inga ombud. Ombud tas bort ur `options`, och hemleverans erbjuds. Säger PostNord att hemleverans inte erbjuds till postnumret blir det `manual` i stället.
- `manual`: PostNord svarade inte. Ombud går att välja, och ombud väljs åt kunden i efterhand.
- `unverified`: PostNord avvisade anropet eller svarade i en form vi inte känner igen. Som `manual`, men kassan säger tydligt att leveransalternativet inte kunde kontrolleras.

Övrigt:

- `estimatedDelivery: null` betyder att kassan visar "Beräknad leveranstid är tillfälligt otillgänglig.", oavsett orsak.
- Ogiltigt postnummer, från ombudssökningen eller leveranstiden: 400 med `{ "status": "fel", "field": "shipping_postal_code", "error": "Postnumret finns inte. Kontrollera det." }`.
- Hemleverans som PostNord säger inte erbjuds till postnumret tas bort ur `options`.
- Svaret innehåller aldrig PostNords texter eller skäl.

**Endpoint 2: `GET /api/shipping/estimate?postalCode=39365&servicePointId=331366`**

Anropas när kunden har valt ett ombud eller en paketbox, och räknar leveranstiden till just den platsen. Svaret är `{ "estimatedDelivery": "2026-11-02" }` eller `null`. Ombudets id kontrolleras som siffror.

**Loggning**

- PostNord svarar inte (`unavailable`): `console.warn`, "PostNord svarar inte: ...".
- Avvisat anrop eller oväntat svar (`rejected`, `invalidResponse`): `console.error`, "Integrationsfel mot PostNord: ...".
- Övriga utfall: `console.warn` med skälet.

**Tester**

Varje `servicePointStatus`, ogiltigt postnummer från båda källorna, partiellt resultat, saknad leveranstid, hemleverans som inte erbjuds, att ombud tas bort vid `none`, och att svaret aldrig innehåller PostNords skäl.

**Inte i steg 7**

Kolumner på `orders` (steg 8), ordern och Stripe (steg 9) och kassan i React (steg 10).

En sak att tänka på till steg 10: varje uppslag ger fyra anrop till PostNord, två för ombud och paketboxar och två för leveranstider. Kassan bör därför bara fråga när postnumret är komplett.

Godkänner du steg 7?

---

## Prompt 30 (30 okt 2026)

> Ja men tänk på detta:
>
> Fyra PostNord-anrop per uppslag är acceptabelt för laborationen, men vi ska undvika onödiga upprepningar.
>
> Planera för att kassan bara gör uppslag när postnumret är komplett och inte skickar nya förfrågningar vid varje tangenttryckning.

### Svar

**Steg 7: klart**

- **`server/lib/shippingQuote.ts` (ny):** `buildShippingQuote` översätter adapterns utfall till svaret till kassan, enligt förslaget: `servicePointStatus` blir `found`, `none`, `manual` eller `unverified`. Ombud tas bort vid `none`, hemleverans tas bort bara när PostNord uttryckligen säger att den inte erbjuds, och ett ogiltigt postnummer från någon av sökningarna ger `invalidPostalCode`. Funktionen returnerar också loggraderna: "PostNord svarar inte" som varning, och "Integrationsfel mot PostNord" som fel för avvisade anrop och oväntade svar.
- **`server/routes/shipping.ts` (ny):** `GET /api/shipping/options` och `GET /api/shipping/estimate`. Postnumret och ombudets id kontrolleras med Zod. Varukorgens summa räknas på servern. Fraktalternativen, ombudssökningen och de två leveranstiderna hämtas samtidigt. Ett ogiltigt postnummer ger 400 med "Postnumret finns inte. Kontrollera det." och fältets namn.
- **`server/app.ts`:** routen är monterad på `/api/shipping`.
- **`.env.example`:** `SHOP_POSTAL_CODE=39365`. Koden använder 39365 om variabeln saknas.
- **`server/lib/shippingQuote.test.ts` (ny):** 13 tester, bland annat alla fyra värdena på `servicePointStatus`, ogiltigt postnummer från båda sökningarna, att ett fel i leveranstiden aldrig tar bort hemleverans, och att svaret till kassan aldrig innehåller PostNords skäl men att loggen gör det.

**Resultat:** typkontrollen utan fel, och 77 av 77 tester godkända.

**Uppslagen i kassan, plan för steg 10**

- Kassan frågar först när postnumret är fem siffror och har klarat kassans egen kontroll. Ingen förfrågan skickas medan kunden skriver.
- Samma postnummer frågas inte igen. Kassan sparar senaste uppslaget, så att en ny rendering, att kunden lämnar fältet eller skriver om samma postnummer inte ger nya anrop.
- Ändras postnumret medan ett uppslag pågår avbryts det gamla med `AbortController`, så att ett sent svar aldrig skriver över ett nyare.
- Leveranstiden till ett valt ombud hämtas en gång per ombud och sparas, så att kunden kan byta fram och tillbaka utan nya anrop.

**Prova routen**

Routen har bara testats med låtsade svar. Med din API-server igång kan du öppna de här adresserna i webbläsaren (port 3000, som i `.env.example`):

1. `http://localhost:3000/api/shipping/options?postalCode=39365`: `servicePointStatus` ska vara `found`, med ombud och paketboxar, priserna 69 och 139 kr och beräknad leverans.
2. `http://localhost:3000/api/shipping/options?postalCode=00000`: 400 med "Postnumret finns inte. Kontrollera det."
3. `http://localhost:3000/api/shipping/options?postalCode=123`: 400 med "Postnumret ska vara fem siffror".
4. `http://localhost:3000/api/shipping/estimate?postalCode=39365&servicePointId=331366`: ett datum.
5. `http://localhost:3000/api/shipping/estimate?postalCode=39365&servicePointId=999999999`: `null`, och en varning i serverns terminal.

Startades API-servern innan PostNords rader lades in i `.env` behöver den startas om, annars blir svaret `manual` utan leveranstider. Säg till vad du får, så går vi vidare till steg 8.

---

## Prompt 31 (30 okt 2026)

> Alla tester går igenom precis som tänkt!

### Svar

Då fungerar routen hela vägen: databasen, PostNord och felhanteringen. Här är förslaget för steg 8. Ingen kod och inget i databasen är ändrat.

**Kolumner på `orders`**

Ordern sparar kopior, inte hänvisningar, på samma sätt som `order_items` sparar produktens titel och pris. Ändras ett fraktpris eller ett ombud senare visar ordern ändå det som gällde när den skapades.

```sql
ALTER TABLE orders ADD COLUMN shipping_method TEXT CHECK (shipping_method IN ('ombud', 'hem'));
ALTER TABLE orders ADD COLUMN shipping_method_name TEXT;
ALTER TABLE orders ADD COLUMN shipping_price NUMERIC(10,2) CHECK (shipping_price >= 0);
ALTER TABLE orders ADD COLUMN service_point_status TEXT CHECK (service_point_status IN ('Vald', 'Väntar'));
ALTER TABLE orders ADD COLUMN service_point_id TEXT;
ALTER TABLE orders ADD COLUMN service_point_country_code TEXT;
ALTER TABLE orders ADD COLUMN service_point_name TEXT;
ALTER TABLE orders ADD COLUMN service_point_street TEXT;
ALTER TABLE orders ADD COLUMN service_point_postal_code TEXT;
ALTER TABLE orders ADD COLUMN service_point_city TEXT;
ALTER TABLE orders ADD CONSTRAINT orders_service_point_check CHECK (
  shipping_method IS NULL
  OR (shipping_method = 'hem' AND service_point_status IS NULL AND service_point_id IS NULL)
  OR (shipping_method = 'ombud' AND service_point_status = 'Väntar' AND service_point_id IS NULL)
  OR (shipping_method = 'ombud' AND service_point_status = 'Vald' AND service_point_id IS NOT NULL)
);
```

- `shipping_method` är koden (`ombud` eller `hem`), och `shipping_method_name` namnet som kunden såg.
- `shipping_price` är det kunden betalade för frakten, 0 vid fri frakt.
- `service_point_status` är "Vald" eller "Väntar", i samma stil som `payment_status`. Vid hemleverans är den tom.
- Ombudet sparas med id och landskod, eftersom PostNords id bara är unikt tillsammans med landskoden, och med namn och besöksadress, så att admin och tacksidan kan visa det utan att fråga PostNord.
- Den sista regeln gör att databasen själv vägrar orimliga kombinationer: hemleverans med ombud, "Vald" utan ombud, eller "Väntar" med ombud.
- Alla kolumner får vara tomma, eftersom gamla ordrar saknar frakt. Den deployade butiken påverkas inte, eftersom den inte skriver till kolumnerna.
- Typen av plats (ombud eller paketbox) sparas inte. Namnet säger det redan, till exempel "Paketbox Miljöhus Lassevägen".

**En fråga: ska `total_amount` innehålla frakten?**

Mitt förslag är ja. Då är `total_amount` samma belopp som kunden betalar i Stripe, och admin ser direkt vad kunden betalade. Varornas summa går fortfarande att räkna fram ur `order_items`. Gamla ordrar har ingen frakt, så för dem är summan oförändrad.

**Filer**

Bara `db/schema.sql`, där raderna ovan läggs sist. Koden som skriver till kolumnerna kommer i steg 9.

Godkänner du kolumnerna och förslaget om `total_amount`? Då lägger jag in raderna i `db/schema.sql`, och du kör dem i SQL-editorn i Supabase.

---

## Prompt 32 (30 okt 2026)

> Jag godkänner steg 8 och att `total_amount` ska innehålla fraktkostnaden. Det ska motsvara det totala belopp kunden betalar via Stripe.
>
> Jag godkänner också att fraktuppgifterna sparas som en ögonblicksbild på ordern.
>
> Jag vill dock ha två justeringar:
>
> 1. Gör databasens CHECK-regel något striktare. Vid hemleverans ska samtliga ombudsfält vara NULL, inte bara status och ID. När ett ombud har status `Vald` ska både ombuds-ID och landskod finnas.
> 2. Kontrollera hur `db/schema.sql` är uppbyggd så att vi inte blandar ihop det fullständiga schemat med migrationskommandon. Jag vill ha tydliga SQL-kommandon som jag kan köra i Supabase SQL Editor utan att påverka befintliga ordrar.
>
> Behåll bakåtkompatibiliteten med gamla ordrar.
>
> Du får nu genomföra steg 8 i filerna

### Svar

**Beslutat:** `total_amount` innehåller frakten och är samma belopp som kunden betalar i Stripe. Fraktuppgifterna sparas som en ögonblicksbild på ordern.

**Så är `db/schema.sql` uppbyggd**

README:n säger att en ny databas byggs med `db/schema.sql` och sedan `db/seed.sql`. Filen är alltså tänkt att beskriva hela strukturen. Men den är skriven i den ordning ändringarna gjorts: först `CREATE TABLE`, sedan `ALTER TABLE` sist i filen, och dessutom en rad som ändrar data (`UPDATE orders SET payment_status = 'Betald'`). Mot en tom databas fungerar det. Mot den befintliga databasen går den inte att köra, eftersom den stoppar redan vid första `CREATE TABLE`.

Lösningen är att hålla isär de två:

- **`db/schema.sql`** fortsätter beskriva hela strukturen för en tom databas. De nya kolumnerna och reglerna ligger sist, i samma stil som tidigare ändringar.
- **`db/migrations/`** (ny mapp) innehåller ändringar som körs en gång mot den befintliga databasen, en fil per ändring med datum i namnet.

`UPDATE`-raden i `schema.sql` lämnar jag orörd. Den gör ingenting i en tom databas, men hör egentligen hemma i en migration.

**Nya och ändrade filer**

- **`db/migrations/2026-10-30-orders-shipping.sql` (ny):** den här kör du nu. Den ligger inom `BEGIN` och `COMMIT`, så antingen går allt igenom eller ingenting. Kolumnerna läggs till med `ADD COLUMN IF NOT EXISTS`. Körs filen en gång till stoppar den på reglerna, som redan finns, och då ändras ingenting.
- **`db/migrations/2026-10-30-shipping-methods.sql` (ny):** tabellen och startvärdena från steg 6, som du redan har kört. Den finns med så att alla ändringar går att följa.
- **`db/schema.sql`:** samma kolumner och regler sist i filen.

**De två reglerna**

1. **`orders_shipping_check`:** fraktsätt, namn och pris finns antingen alla tre eller inga. Den lade jag till, så att en ny order inte kan sakna fraktpris.
2. **`orders_service_point_check`,** striktare enligt din justering:
   - Gamla ordrar och hemleverans: alla sju ombudsfält är tomma, även status.
   - Ombud med "Väntar": alla sex fält för själva ombudet är tomma, eftersom ombudet väljs i efterhand.
   - Ombud med "Vald": både ombudets id och landskoden krävs.
   - Ombud utan status: nekas.

Reglerna räknar ifyllda fält med `num_nonnulls`, en inbyggd funktion i Postgres, så att listan med fält inte behöver skrivas som långa rader med `AND ... IS NULL`.

**Gamla ordrar**

Alla nya kolumner får vara tomma, och båda reglerna godkänner en order där allt som gäller frakt är tomt. Det är just så gamla ordrar ser ut, så de godkänns när reglerna läggs till, och inget i dem ändras. Den deployade butiken skriver inte till kolumnerna, så den påverkas inte heller.

**Så kör du migrationen**

1. Öppna `db/migrations/2026-10-30-orders-shipping.sql`, kopiera allt och kör det i SQL Editor i Supabase.
2. Kontrollera efteråt:

   ```sql
   SELECT count(*) AS ordrar, count(shipping_method) AS med_frakt FROM orders;
   SELECT conname FROM pg_constraint
   WHERE conrelid = 'orders'::regclass AND conname IN ('orders_shipping_check', 'orders_service_point_check');
   ```

   `med_frakt` ska vara 0, och båda reglerna ska synas.

**Valfritt innan du kör**

Jag har inte kunnat köra SQL:en själv. Om du vill kan jag först provköra migrationen mot en tillfällig Postgres i minnet (PGlite), installerad i min tillfälliga mapp och inte i projektet. Där kan jag lägga in några låtsade gamla ordrar och visa att de godkänns, och att reglerna stoppar hemleverans med ombud och "Vald" utan landskod. Det kräver att ett paket laddas ner, och du godkänner kommandot först.

---

## Prompt 33 (30 okt 2026)

> migrationen är körd och kontrollen godkänd av mig.

### Svar

Då är databasen klar för frakt på ordern. Här är förslaget för steg 9. Ingen kod är ändrad.

**Vad kassan skickar**

`POST /api/orders` får två nya fält: `shipping_method` (`ombud` eller `hem`) och `service_point_id` (bara vid ombud, och bara siffror). Kassan skickar aldrig något pris.

**Vad servern gör, i den här ordningen**

1. Kontrollerar alla fält med Zod, som i dag.
2. **Kontrollerar ombudet mot PostNord innan ordern skapas,** så att inget anrop till PostNord görs medan databastransaktionen är öppen:

   | Ombudssökningen ger                            | Med valt ombud                                                           | Utan valt ombud                          |
   | ---------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
   | `found`, ombudet finns i listan                | "Vald", ombudet sparas                                                   |                                          |
   | `found`, ombudet saknas, alla grupper svarade  | 400: "Det valda ombudet finns inte för ditt postnummer. Välj ett annat." | 400: "Välj ett ombud eller en paketbox." |
   | `found`, ombudet saknas, en grupp svarade inte | "Väntar", eftersom valet inte gick att kontrollera                       | 400: "Välj ett ombud eller en paketbox." |
   | `noServicePoints`                              | 400, samma text som när ombudet saknas                                   | "Väntar"                                 |
   | `unavailable`                                  | "Väntar", varning i loggen                                               | "Väntar"                                 |
   | `rejected`, `invalidResponse`                  | "Väntar", integrationsfel i loggen                                       | "Väntar"                                 |
   | `invalidPostalCode`                            | 400 under postnummerfältet                                               | 400 under postnummerfältet               |

   Vid hemleverans görs ingen ombudssökning. Servern frågar i stället om leveranstiden för hemleverans, men bara för att kontrollera postnumret: säger PostNord att det inte finns blir det 400 under postnummerfältet. Svarar PostNord inte går köpet igenom.

3. I transaktionen, som i dag: läser varukorgen, kontrollerar lagret och räknar varornas summa med priserna i databasen.
4. Räknar fraktpriset med `calculateShipping` utifrån tabellen och varornas summa.
5. Sparar ordern med `total_amount` = varor + frakt, och alla fraktfält som en ögonblicksbild.
6. Skapar Stripe-sessionen med frakten som en egen rad, "Frakt: Hemleverans" eller "Frakt: Ombud eller paketbox". Vid fri frakt blir det ingen fraktrad, eftersom beloppet är 0.

**Filer**

- `server/lib/shippingChoice.ts` (ny): beslutet i tabellen ovan, som en funktion utan databas och utan anrop, så att den går att testa.
- `server/lib/shippingChoice.test.ts` (ny): ett test per rad i tabellen.
- `server/routes/orders.ts`: de nya fälten, kontrollen före transaktionen, frakten i summan och de nya kolumnerna.
- `server/integrations/paymentAdapter.ts`: fraktraden i Stripe.
- `server/integrations/shippingCarrier.ts` och `postnordAdapter.ts`: `ServicePoint` får `countryCode`, hämtad ur PostNords besöksadress. Annars skulle routen behöva skriva "SE" själv, och det är kunskap som hör till adaptern. Adapterns tester uppdateras.

**Att känna till**

Efter steg 9 kräver `POST /api/orders` ett fraktsätt, och dagens kassa skickar inget. Lokalt går det alltså inte att lägga en order förrän kassan är klar i steg 10. Den deployade butiken påverkas inte, eftersom inget deployas förrän i steg 13.

Godkänner du steg 9?

---

## Prompt 34 (30 okt 2026)

> Jag godkänner huvuddelen av steg 9, men vill att du justerar två saker innan implementationen.
>
> **1. Bekräftat saknade ombud**
>
> I tabellen står att ett resultat där PostNord bekräftat att inga ombud finns kan ge status `Väntar` om kunden inte valt något ombud.
>
> Det vill jag inte.
>
> Skilj mellan att PostNord inte kunde kontrollera ombuden och att PostNord faktiskt kontrollerade och bekräftade att inga finns.
>
> Vid bekräftat saknade ombud ska kunden inte kunna slutföra en order med fraktsätt `ombud`. Kunden får välja hemleverans om den är tillgänglig.
>
> Vid tekniska fel kan vi däremot behålla möjligheten till manuell hantering.
>
> **2. Orderbelopp och Stripe**
>
> Säkerställ att varornas summa plus serverberäknad frakt alltid motsvarar både `orders.total_amount` och beloppet i Stripe.
>
> Fraktpriser och gränser för fri frakt ska hämtas från databasen, inte från klienten.
>
> Kontrollera också att den befintliga hanteringen av misslyckad Stripe-session fortfarande fungerar korrekt.
>
> I övrigt godkänner jag filuppdelningen och teststrategin.
>
> Du får genomföra steg 9 efter dessa justeringar.

### Svar

**Steg 9: klart, med båda justeringarna**

**1. Bekräftat saknade ombud**

- Vid ordern: säger PostNord att det inte finns några ombud (`noServicePoints`) nekas ombud alltid, med eller utan valt ombud: 400 under fraktvalet med "Det finns inga ombud eller paketboxar för ditt postnummer. Välj hemleverans."
- "Väntar" blir det bara när PostNord inte kunde kontrollera: inget svar, avvisat anrop, oväntat svar, eller när valt ombud saknas och en grupp inte svarade.
- Samma regel gällde inte fullt ut i routen från steg 7. Där blev "inga ombud och ingen hemleverans" manuell hantering. Det är rättat: har PostNord bekräftat att inga ombud finns erbjuds aldrig ombud, även om hemleverans inte heller går. Då får kassan inga fraktalternativ alls. Testet för det fallet är ändrat.
- Hemleverans som PostNord säger inte erbjuds till postnumret nekas också vid ordern, i samma stil.

**2. Orderbelopp och Stripe**

- Fraktsätt, pris och gräns för fri frakt läses ur `shipping_methods` i databasen. Kassan skickar bara `shipping_method` och `service_point_id`, och Zod tar inte emot något pris.
- Varornas summa räknas på priserna i databasen, i transaktionen, som förut.
- **Ny fil `server/lib/orderTotals.ts`:** `buildPaymentLines` gör raderna till betalningen i ören, en per vara och en för frakten. Fri frakt ger ingen fraktrad. Summan av raderna blir `totalOre`.
- **Samma rader används två gånger:** `orders.total_amount` sparas som `totalOre / 100`, och exakt samma rader skickas till Stripe. Beloppen kan alltså inte skilja sig, eftersom de räknas fram ur samma tal.
- **Extra kontroll:** Stripe svarar med sin egen summa (`amount_total`). Är den inte exakt `totalOre` räknas det som att betalningen inte gick att starta.
- `paymentAdapter.ts` tar emot de färdiga raderna i ören, i stället för att räkna om priserna själv.

**Misslyckad Stripe-session**

Så fungerade det före steg 9, och det gör det fortfarande:

- Ordern sparas som "Obetald" i en transaktion. Först efter det anropas Stripe.
- Misslyckas Stripe får kunden 502 med "Betalningen kunde inte startas just nu. Försök igen om en stund.", och felet loggas på servern.
- Varukorgen töms inte, eftersom det bara görs i webhooken efter betalning. Kunden kan alltså försöka igen, och då skapas en ny order.
- Webhooken ändrar bara ordrar som är "Obetald", så en dubbel händelse kan inte ändra en avbruten order.

Det jag ändrade: den misslyckade ordern låg tidigare kvar som "Obetald" för alltid, eftersom det inte fanns någon Stripe-session som kunde gå ut. Med frakt hade en sådan order dessutom kunnat ligga kvar med ombud "Väntar" och se ut att behöva ett ombud i admin. Nu markeras den "Avbruten", men bara om den fortfarande är "Obetald". Misslyckas den markeringen loggas det, och kunden får samma 502 som förut.

**Ordern i övrigt**

- Ombud och postnummer kontrolleras mot PostNord innan transaktionen öppnas, så att databasen aldrig väntar på PostNord.
- **Ny fil `server/lib/shippingChoice.ts`:** `chooseServicePoint` och `checkHomeDelivery` avgör ombud och hemleverans vid ordern och ger ögonblicksbilden till ordern.
- **Ny fil `server/lib/shopConfig.ts`:** `shopPostalCode()`, som både routen för kassan och ordern använder.
- `ServicePoint` har fått `countryCode`, som adaptern tar från PostNords besöksadress. "Vald" sparas med id och landskod.
- Svaret till kassan har fått `servicePointStatus` ("Vald" eller "Väntar"), så att kassan kan visa rätt text.

**Tester**

- `server/lib/shippingChoice.test.ts` (ny): 11 tester. Bland annat valt ombud som finns, som saknas, som inte gick att kontrollera, ombud utan val, bekräftat inga ombud med och utan val, tekniska fel, loggnivåer, ogiltigt postnummer och hemleverans som inte erbjuds.
- `server/lib/orderTotals.test.ts` (ny): 5 tester, bland annat att summan är varor plus frakt under gränsen, att fri frakt inte ger någon fraktrad, och att orderns summa alltid är summan av raderna till Stripe.
- `shippingQuote.test.ts` och `postnordAdapter.test.ts` är uppdaterade för den nya regeln och för `countryCode`.

**Resultat:** typkontrollen utan fel, och 93 av 93 tester godkända. Inga långa streck eller pilar i serverkoden eller SQL-filerna.

**Inte testat än**

`POST /api/orders` har inte körts mot databasen och Stripe, eftersom kassan inte skickar fraktsätt förrän i steg 10. Hela kedjan, med ett testköp, prövas när kassan är klar.

Nästa steg är 10, kassan i React. Godkänner du det?

---

## Prompt 35 (30 okt 2026)

> Ja jag godkänner det! Vi behöver ta hänsyn till vad som händer om kunden ändrar sitt postnummer efter att ha valt ombud.

### Svar

**Steg 10: kassan, klar i koden**

**När kunden ändrar postnumret efter att ha valt ombud**

- Ett valt ombud gäller bara det postnummer det valdes för. Blir postnumret ett annat, eller ofullständigt, tas valet bort direkt, och fraktavsnittet säger "Du har ändrat postnumret. Välj ombud eller paketbox igen." Texten försvinner när kunden väljer ett nytt ombud.
- "393 65" och "39365" räknas som samma postnummer, så att lägga till eller ta bort mellanslaget tar inte bort valet.
- Svaret från servern sparas tillsammans med sitt postnummer. Kassan använder bara ett svar som hör till postnumret som står i fältet just nu, så ett svar för ett gammalt postnummer kan aldrig visas eller skickas med ordern.
- Ombudets id skickas bara om ombudet finns i svaret för det aktuella postnumret. Servern kontrollerar dessutom själv att ombudet hör till postnumret, och nekar annars.
- Säger servern vid ordern att ombudet eller fraktsättet inte längre går, tas valet bort, felet visas i fraktavsnittet och ombuden hämtas på nytt.

**Uppslagen, som du bad om**

- Kassan frågar först när postnumret är fem siffror. Inga anrop görs medan kunden skriver.
- Varje postnummer frågas en gång. Svaren sparas, så att byta tillbaka till ett tidigare postnummer inte ger något nytt anrop. Bara misslyckade uppslag sparas inte, så att "Försök igen" frågar på nytt.
- Ändras postnumret medan ett uppslag pågår avbryts det gamla anropet med `AbortController`.
- Leveranstiden till ett valt ombud hämtas en gång per ombud och postnummer och sparas.

**Det kunden ser**

- **Fraktavsnittet** under adressen, med "Vi skickar bara inom Sverige."
- **Fraktsätten** som egna valknappar (`role="radio"`), inte webbläsarens väljare: namn, pris eller "Fri frakt", "Beräknad leverans: måndag 2/11" eller "Beräknad leveranstid är tillfälligt otillgänglig.", och "Handla för 90 kr till för fri frakt." när det fattas något till gränsen.
- **Ombud och paketboxar** i var sin grupp, med namn, adress och avstånd. Saknas en grupp står det till exempel "Paketboxar kan inte visas just nu."
- **Valt ombud:** öppettiderna sammanslagna, till exempel "Alla dagar 07.00-22.00" eller "Dygnet runt", "Visa på karta" som öppnar koordinaterna i OpenStreetMap, och för paketboxar "Hämtas med PostNord App eller BankID". Leveranstiden byts till tiden för just det ombudet.
- **Utan kontrollerade ombud:** vid `manual` "Vi kan inte visa ombud just nu. Vi väljer ett ombud nära din adress åt dig efter beställningen." Vid `unverified` "Leveransalternativet kunde inte kontrolleras just nu. Vi väljer ett ombud nära din adress åt dig efter beställningen."
- **Ogiltigt postnummer:** "Postnumret finns inte. Kontrollera det." under postnummerfältet, med röd ram.
- **Inga fraktsätt alls:** "Vi kan tyvärr inte leverera till ditt postnummer."
- **Ordersammanfattningen** har en rad för frakten, och "Att betala" och momsen räknas med frakten. Det är en förhandsvisning, servern räknar om allt.
- **Innan ordern skickas** kontrollerar kassan att fraktsätt är valt, att ombud är valt när det krävs, och att uppslaget är klart. Annars visas felet i fraktavsnittet, och fokus flyttas dit.
- **Varukorgen** säger "Vi skickar bara inom Sverige.", och vid annan valuta "Du betalar i svenska kronor, och vi skickar bara inom Sverige."

**Filer**

- `src/pages/CheckoutPage.tsx`: uppslagen, valen, postnummerbytet och ordern.
- `src/components/ShippingSection.tsx` (ny): fraktavsnittet.
- `src/components/ServicePointPicker.tsx` (ny): ombud och paketboxar i grupper.
- `src/utils/shipping.ts` (ny): postnummer, datum, avstånd, öppettider och kartlänk.
- `src/types/types.ts`: typerna för svaret från `/api/shipping/options`.
- `src/pages/CartPage.tsx`: texten om att vi bara skickar inom Sverige.
- `src/index.css`: nya designvariabler överst (färger, ramar, radier, avstånd, textstorlekar, övergång), och stilarna för fraktavsnittet, som bara använder variablerna. Regeln `.checkout-page button` gav alla knappar i kassan den orange stilen, så den gäller nu bara betalningsknappen, `.checkout-submit`.

**Kontroller**

Typkontrollen utan fel för både frontend och server, och 93 av 93 tester godkända. Lint visar bara två varningar som fanns sedan tidigare, i `CurrencyContext.tsx` och `CartContext.tsx`.

**Prova i webbläsaren**

Kassan har inte provats i en webbläsare än. Med varor i varukorgen:

1. Kassan visar "Fyll i ditt postnummer så visas fraktalternativen."
2. Skriv 393 65. Öppna fliken Nätverk i utvecklarverktygen: det ska bli ett enda anrop till `/api/shipping/options`, inget medan du skriver.
3. Välj ombud, och sedan Ica Supermarket Lindsdal: öppettider, "Visa på karta" och ett anrop till `/api/shipping/estimate`.
4. Välj en paketbox: "Hämtas med PostNord App eller BankID" och "Dygnet runt".
5. Ändra postnumret till 111 51: valet försvinner, texten om att välja igen visas, och listan gäller Stockholm. Byt tillbaka till 393 65: inget nytt anrop.
6. Skriv 00000: "Postnumret finns inte. Kontrollera det."
7. Tryck "Gå till betalning" utan fraktsätt, och sedan med ombud men utan valt ombud.
8. Kontrollera fraktraden och "Att betala", och att en varukorg över 399 kr ger "Fri frakt" för ombud.
9. Gå till betalning: Stripe ska visa fraktraden och samma summa som kassan.
10. Varukorgen ska säga "Vi skickar bara inom Sverige."

Säg till vad du ser, så går vi vidare till steg 11, admin och tacksidan.

---

## Prompt 36 (30 okt 2026)

> _(Skärmdump av Stripes betalformulär: Chilisalsa Rökig, mängd 6, 69,00 kr styck, totalt 414,00 kr, ingen fraktrad.)_
>
> Allt funkar men stripe visar bara summan, ingen egen rad för frakt, eller ja, frakten var ju gratis här

### Svar

Det stämmer med hur det är byggt. Varukorgen var 6 × 69 kr = 414 kr, alltså över gränsen på 399 kr för ombud, så frakten blev 0 kr. `buildPaymentLines` lägger bara till en fraktrad när frakten kostar något, så Stripe fick en enda rad. Summan är rätt: varor 414 kr plus frakt 0 kr.

**Två saker att ta ställning till**

1. **Prova med frakt som kostar.** Med en varukorg under 399 kr, till exempel en flaska, ska Stripe visa två rader: varan och "Frakt: Ombud eller paketbox" för 69 kr, och summan ska vara samma som "Att betala" i kassan. Det är det testet som visar att frakten ingår i beloppet i Stripe.
2. **Visa fri frakt även i Stripe?** Stripes dokumentation säger att en rad på 0 kr är tillåten. Mitt förslag är att fraktraden alltid skickas med, och vid fri frakt som "Frakt: Ombud eller paketbox (fri frakt)" för 0 kr. Då ser kunden i Stripe samma sak som i kassan, och det syns att frakten är med i beräkningen. Summan påverkas inte. Ändringen gäller bara `server/lib/orderTotals.ts` och ett test i `orderTotals.test.ts`.

Vill du att jag gör ändringen i punkt 2?

Källor:

- [Stripe: No-cost orders](https://docs.stripe.com/payments/checkout/no-cost-orders)

---

## Prompt 37 (30 okt 2026)

> _(Skärmdump av Stripes betalformulär: Chilisalsa Rökig, mängd 4, 69,00 kr styck, 276,00 kr. Frakt: Ombud eller paketbox, mängd 1, 69,00 kr. Totalt 345,00 kr.)_
>
> Se bilden.

### Svar

Det är precis som det ska vara:

- Varorna kostar 4 × 69 kr = 276 kr, alltså under gränsen på 399 kr för ombud, så frakten kostar 69 kr.
- Stripe visar frakten som en egen rad, "Frakt: Ombud eller paketbox", med samma namn som i `shipping_methods`.
- Totalen i Stripe är 345 kr = 276 kr + 69 kr. Det är samma belopp som `total_amount` på ordern, eftersom båda räknas fram ur samma rader i ören.

Därmed är två saker i "Klart när" visade lokalt: att beloppet i Stripe är varor plus frakt, och att fri frakt ger 0 kr när ordervärdet når gränsen (förra skärmdumpen).

Frågan från förra svaret står kvar: ska fraktraden skickas med även vid fri frakt, som "Frakt: Ombud eller paketbox (fri frakt)" för 0 kr? Svara ja eller nej, så gör jag den ändringen eller låter bli, och sedan går vi vidare till steg 11, admin och tacksidan.

---

## Prompt 38 (30 okt 2026)

> Fri frakt behöver inte synas i stripe.

### Svar

**Beslutat:** ingen fraktrad i Stripe vid fri frakt. Koden är redan byggd så, och ingenting ändras.

Här är förslaget för steg 11. Ingen kod är ändrad.

**Tacksidan**

- `GET /api/orders/session/:sessionId` skickar också fraktsätt, fraktpris, ombudsstatus och ombudets namn och adress.
- Tacksidan visar en rad för frakten ("Fri frakt" eller priset), och under den:
  - Vid "Vald": "Hämtas hos Ica Supermarket Lindsdal, Kanngjutarvägen 5, 39365 Kalmar".
  - Vid "Väntar": "Vi väljer ett ombud nära din adress. Du får veta vilket när paketet skickas."
  - Vid hemleverans: "Levereras till din adress".

**Orderlistan i admin**

- En ny kolumn för frakten: fraktsättets namn och pris.
- Betalda ordrar med ombudsstatus "Väntar" markeras med "Ombud saknas". Obetalda och avbrutna ordrar markeras inte, eftersom de inte ska skickas.

**Ordersidan i admin**

- Ett avsnitt för frakt med fraktsätt, fraktpris, och vid "Vald" ombudets namn, adress, id och landskod.
- Vid "Väntar" en knapp, "Hämta ombud". Den hämtar ombud och paketboxar för orderns postnummer via servern och visar dem med samma väljare som i kassan. Admin väljer ett och sparar.
- **`GET /api/admin/orders/:id/service-points`** (ny, bakom inloggningen): söker ombud för orderns postnummer.
- **`PUT /api/admin/orders/:id/service-point`** (ny, bakom inloggningen): tar emot ombudets id, söker ombuden för postnumret igen och sparar bara om id:t finns i svaret. Då blir ordern "Vald" med en ögonblicksbild. Uppdateringen gäller bara ordrar som är "Väntar", så ett val som redan är gjort kan inte skrivas över av misstag.
- Svaren till admin:
  - PostNord svarar inte: 502, "PostNord svarar inte just nu. Försök igen senare." Ordern står kvar som "Väntar".
  - Ombudet finns inte för postnumret: 400.
  - PostNord säger att postnumret inte finns: 400, "Postnumret på ordern finns inte enligt PostNord. Kontakta kunden."
  - Inga ombud finns: 400, "Det finns inga ombud för orderns postnummer."
  - Avvisat anrop eller oväntat svar: 502, och ett integrationsfel i loggen.

**Filer**

- `server/lib/shippingChoice.ts`: en ny funktion, `assignServicePoint`, för beslutet när admin sparar ett ombud. Den gör inga anrop, så den går att testa.
- `server/lib/shippingChoice.test.ts`: tester för den.
- `server/routes/adminOrders.ts`: fraktfälten i listan och på ordern, och de två nya endpointsen.
- `server/routes/orders.ts`: fraktfälten till tacksidan.
- `src/types/types.ts`: fraktfälten på `Order`.
- `src/pages/ThankYouPage.tsx`, `src/pages/AdminOrdersPage.tsx` och `src/pages/AdminOrderDetailPage.tsx`.
- `src/index.css`: stilar för fraktavsnitten, med designvariablerna.

En liten sak: rubriken "DAtum" i orderlistan rättas till "Datum", eftersom filen ändå ändras.

Godkänner du steg 11?

---

## Prompt 39 (30 okt 2026)

> Jag godkänner steg 11 med tre tillägg:
>
> 1. Granska behörighetskontrollen för GET /api/orders/session/:sessionId och säkerställ att orderuppgifter inte kan hämtas obehörigt. Behåll befintligt fungerande tacksidesflöde.
> 2. Tilldelning av ombud via admin ska endast tillåtas för betalda, ej avbrutna eller återbetalda ordrar med ombudsstatus Väntar. Validera detta på servern.
> 3. Gör databasuppdateringen atomär så att två samtidiga administratörer inte kan skriva över varandras ombudsval.
>    Implementera enligt planen, komplettera med tester och redovisa resultatet. Ändra inte andra funktioner i onödan.

### Svar

**Steg 11: klart, med de tre tilläggen**

**1. Behörigheten för tacksidan, `GET /api/orders/session/:sessionId`**

Så var det innan: den som hade Stripes sessions-id fick se ordern, utan någon annan kontroll. Id:t är långt och slumpat, så det går inte att gissa. Men det står i adressen till tacksidan, och kan därför hamna i webbläsarens historik, i en delad länk eller i en skärmdump.

Ändringar:

- Ordern visas bara om den hör till varukorgen i besökarens kaka (`session_id`), som sätts av butiken och inte går att läsa med JavaScript (`httpOnly`). SQL:en kopplar ordern till `carts` och kräver både rätt sessions-id och rätt kaka. Den som bara har länken får "Vi hittade ingen order."
- Sessions-id:t kontrolleras med Zod, så det måste se ut som ett av Stripes (`cs_` följt av bokstäver, siffror och understreck). Annat ger samma svar som en order som inte finns.
- Alla misslyckanden ger samma 404, så att svaret inte avslöjar om en order finns.
- Svaret innehåller inga personuppgifter: inget namn, ingen e-post, ingen adress och inget telefonnummer. Bara ordernummer, summa, betalstatus, varor och frakten. Ombudets adress är en offentlig plats.

Flödet för tacksidan fungerar som förut: kunden kommer tillbaka från Stripe i samma webbläsare, med samma kaka. Varukorgens rad finns kvar efter betalningen, eftersom webhooken bara tömmer varorna i den.

**2. Vilka ordrar som får ett ombud, kontrollerat på servern**

- `assignmentBlocker` i `server/lib/shippingChoice.ts` tillåter bara ordrar där fraktsättet är ombud, ombudsstatusen är "Väntar", betalningen är "Betald" och orderstatusen inte är "Återbetald". En avbruten order är aldrig "Betald", så den nekas också.
- Både `GET /api/admin/orders/:id/service-points` och `PUT /api/admin/orders/:id/service-point` kontrollerar detta först och svarar 409 med skälet, till exempel "Ordern är inte betald." Då görs inget anrop till PostNord.
- Ordernumret kontrolleras som ett positivt heltal, och ombudets id som siffror.
- Admin visar samma regel: "Ombud saknas" i listan bara för betalda ordrar som inte är återbetalda, och på ordern förklaras varför ombud inte kan väljas annars. Det är bara för att admin ska förstå, servern avgör.

**3. Atomär uppdatering**

- Samma villkor står i `WHERE` i `UPDATE`-satsen som sparar ombudet: `shipping_method = 'ombud' AND service_point_status = 'Väntar' AND payment_status = 'Betald' AND status <> 'Återbetald'`. Kontrollen och uppdateringen är alltså ett enda steg i databasen.
- Försöker två administratörer spara samtidigt får den andra vänta tills den första är klar. Postgres kontrollerar sedan villkoret igen mot den uppdaterade raden. Där är statusen redan "Vald", så ingen rad uppdateras.
- Uppdateras ingen rad svarar servern 409: "Ordern har ändrats under tiden, till exempel av en annan administratör. Ladda om sidan." Det första valet ligger kvar.
- Förkontrollen i punkt 2 finns för att ge ett tydligt felmeddelande. Det är villkoret i `UPDATE` som skyddar mot att ett val skrivs över.
- Regeln `orders_service_point_check` i databasen ser dessutom till att "Vald" alltid har id och landskod.

**Ändrade och nya filer**

- `server/routes/orders.ts`: bara tacksidans route. Kakan, kontrollen av sessions-id:t och fraktfälten.
- `server/routes/adminOrders.ts`: fraktfälten i listan och på ordern, och de två nya endpointsen. `PUT /:id/status` är oförändrad.
- `server/lib/shippingChoice.ts`: `assignmentBlocker`, `assignServicePoint` och `servicePointsProblem`, som ger felmeddelandena till admin.
- `src/types/types.ts`: `OrderShipping`, fraktfälten på ordern.
- `src/utils/shipping.ts`: `formatPostalCode` och `servicePointAddress`.
- `src/pages/ThankYouPage.tsx`: fraktraden, och "Hämtas hos ...", "Levereras till din adress." eller "Vi väljer ett ombud nära din adress. Du får veta vilket när paketet skickas."
- `src/pages/AdminOrdersPage.tsx`: kolumnen Frakt med namn och pris, märkningen "Ombud saknas", och "DAtum" rättat till "Datum".
- `src/pages/AdminOrderDetailPage.tsx`: avsnittet Frakt, och vid "Väntar" knapparna "Hämta ombud" och "Spara ombud" med samma väljare som i kassan.
- `src/index.css`: stilarna för fraktavsnittet i admin, med designvariablerna. Ytfärgerna har fått ljusa värden i `.admin-layout`, eftersom admin har ett eget ljust tema.

**Tester**

- `server/lib/shippingChoice.test.ts`: 10 nya tester. Vilka ordrar som får ett ombud: betald och väntande, obetald, avbruten, återbetald, redan vald, hemleverans och gamla ordrar. Vad som sparas: ombud som finns, som saknas, i en grupp som inte svarade, PostNord som inte svarar eller svarar fel, ogiltigt postnummer och inga ombud.
- Typkontrollen utan fel för frontend och server, 103 av 103 tester godkända, och lint med bara de två gamla varningarna. Inga långa streck eller pilar i koden.

**Inte testat automatiskt**

Kopplingen till kakan och den atomära uppdateringen kräver databasen och har bara testats genom att granska SQL:en. Så här provar du dem:

1. **Tacksidan:** gör ett testköp. Tacksidan ska visa fraktraden och var paketet hämtas. Kopiera adressen till ett inkognitofönster: där ska det stå "Vi hittade ingen order."
2. **En order som väntar på ombud:** kör det här i SQL Editor på en betald testorder med ombud. Ersätt `ORDER_ID` med orderns nummer:

   ```sql
   UPDATE orders SET service_point_status = 'Väntar', service_point_id = NULL, service_point_country_code = NULL,
     service_point_name = NULL, service_point_street = NULL, service_point_postal_code = NULL, service_point_city = NULL
   WHERE id = ORDER_ID AND shipping_method = 'ombud';
   ```

   Orderlistan ska visa "Ombud saknas". Öppna ordern, tryck "Hämta ombud", välj ett och tryck "Spara ombud". Ordern ska bli "Vald" med ombudets adress.

3. **Två administratörer samtidigt:** gör punkt 2 igen, men öppna ordern i två flikar och tryck "Hämta ombud" i båda. Spara i den första och sedan i den andra. Den andra ska få "Ordern har ändrats under tiden ...", och den första fliken ska visa det första valet.
4. **Obetald order:** en obetald order med "Väntar" ska inte märkas i listan, och ordern ska säga att ombud bara kan väljas för betalda ordrar.

Nästa steg är 12, adminsidan för fraktpriserna.

---

## Prompt 40 (30 okt 2026)

> _(Skärmdump: webbläsaren på `localhost:5174/tack?session_id=cs_test_...` visar "Webbplatsen kan inte nås", `ERR_CONNECTION_REFUSED`.)_
>
> Jag har stripe listen på men tacksidan visas inte, jag ser inga fel i konsolen och inga loggar i terminalen.

### Svar

Felet ligger inte i koden. `ERR_CONNECTION_REFUSED` betyder att ingen server svarar på porten.

Jag kontrollerade vilka portar som har en server, utan att läsa `.env`:

- Port 3000: butikens API (`tsx`).
- Port 5173: butikens Vite.
- Port 5174: ingenting.

Stripe skickar kunden tillbaka till `CLIENT_URL` från `.env`, och adressen i skärmdumpen visar att den är `http://localhost:5174`. Vite startar på 5173 när porten är ledig och tar 5174 bara om något annat redan använder 5173. Den här gången var 5173 ledig, så Vite hamnade där, och returadressen pekade fel.

Det förklarar också varför inget syns i konsolen eller terminalen: webbläsaren kom aldrig fram till butiken. Betalningen och webhooken påverkas inte, eftersom `stripe listen` skickar vidare till API:et på port 3000.

**Se tacksidan nu**

Byt 5174 mot 5173 i adressen och ladda om. Kakan gäller för `localhost` oavsett port, så tacksidan känner igen din varukorg.

**Så att det inte händer igen, välj ett av två**

1. Ändra `CLIENT_URL` i `.env` till `http://localhost:5173` och starta om API-servern, eftersom `.env` bara läses när den startar.
2. Lås Vite till port 5174 med `port: 5174` och `strictPort: true` i `vite.config.ts`. Då startar Vite alltid där, och om porten är upptagen får du ett fel i stället för en ny port i tysthet. Det är en liten ändring i koden, så säg till om du vill ha den.

Jag rekommenderar alternativ 2, eftersom returadressen då alltid stämmer, även när ditt andra projekt kör på 5173.

---

## Prompt 41 (30 okt 2026)

> aaah just det, jag ändrade porten för att jag hade ett annat projekt på 5173

### Svar

Då är det förklarat. När det andra projektet körde fick butikens Vite port 5174, och `CLIENT_URL` stämde. I dag är det andra projektet avstängt, så Vite tog 5173, och returadressen pekade på en port där ingenting svarar.

Det är därför jag föreslår att Vite låses till 5174 med `strictPort: true`. Då startar butiken alltid på samma port oavsett vad som kör på 5173, och `CLIENT_URL` stämmer alltid. Säg till om jag ska göra den ändringen. Annars räcker det att byta till 5173 i adressen den här gången.

---

## Prompt 42 (30 okt 2026)

> Det funkar som tänkt efter mina tester

### Svar

Bra. Då är tacksidan, märkningen i admin, valet av ombud i efterhand och skyddet mot samtidiga val provade i webbläsaren.

**Läge för commit**

Steg 7 till 11 är inte committade. Ändrade filer: `.env.example`, `db/schema.sql`, `docs/ai-logg-labb5.md`, `server/app.ts`, `server/integrations/paymentAdapter.ts`, `postnordAdapter.ts`, `postnordAdapter.test.ts`, `shippingCarrier.ts`, `server/lib/shippingPrice.ts`, `server/routes/adminOrders.ts`, `orders.ts`, `src/index.css`, `src/pages/AdminOrderDetailPage.tsx`, `AdminOrdersPage.tsx`, `CartPage.tsx`, `CheckoutPage.tsx`, `ThankYouPage.tsx` och `src/types/types.ts`. Nya filer: `db/migrations/`, `server/lib/orderTotals.ts`, `shippingChoice.ts`, `shippingQuote.ts`, `shopConfig.ts` med tester, `server/routes/shipping.ts`, `src/components/ServicePointPicker.tsx`, `ShippingSection.tsx` och `src/utils/shipping.ts`.

**Förslag för steg 12: adminsidan för fraktpriser**

Ingen kod är ändrad.

- **`GET /api/admin/shipping`** och **`PUT /api/admin/shipping/:code`** i en ny route, `server/routes/adminShipping.ts`, monterad bakom inloggningen som de andra adminroutes.
- Det som går att ändra: namnet som kunden ser, priset och gränsen för fri frakt. Koden (`ombud`, `hem`) går inte att ändra, eftersom programmet styrs av den.
- Kontroll med Zod på servern: namnet 1 till 50 tecken, priset 0 kr eller mer med högst två decimaler, gränsen tom (ingen fri frakt) eller större än 0. En okänd kod ger 404. Schemat ligger i `server/lib/shippingPrice.ts`, som inte använder databasen, så det går att testa.
- **Ny sida `src/pages/AdminShippingPage.tsx`** på `/admin/frakt`, och länken "Frakt" i adminmenyn. En rad per fraktsätt med fälten Namn, Pris (kr) och Fri frakt från (kr), och en knapp "Spara" per rad. Egen validering med fel under fälten, inga bubblor från webbläsaren. "Sparat" visas efter lyckad sparning.
- Sidan säger "Ändringen gäller nya ordrar. Gamla ordrar behåller fraktpriset de fick.", eftersom ordrarna sparar en ögonblicksbild.
- Ändrar två administratörer samma pris samtidigt vinner den som sparar sist. Det är okej här, eftersom priset inte bygger på något tidigare värde, till skillnad från ombudsvalet.
- **Tester:** schemat för ändringen, med giltiga och ogiltiga värden.
- **Filer:** `server/routes/adminShipping.ts` (ny), `server/app.ts`, `server/lib/shippingPrice.ts` och dess test, `src/pages/AdminShippingPage.tsx` (ny), `src/App.tsx`, `src/components/AdminLayout.tsx`, `src/index.css` och `src/types/types.ts`.

Frågan om att låsa Vite till port 5174 står kvar, om du vill ha det.

Godkänner du steg 12?

---

## Prompt 43 (30 okt 2026)

> Jag godkänner steg 12, och du ska inte låsa vite till 5174, jag får komma ihåg det till nästa gång.

### Svar

**Beslutat:** Vite låses inte. `vite.config.ts` är oförändrad.

**Steg 12: klart**

**Servern**

- **`server/lib/shippingPrice.ts`:** Zod-schemat `ShippingMethodUpdate` för det admin får ändra. Namnet trimmas och måste vara 1 till 50 tecken. Priset ska vara 0 kr eller mer, högst 10 000 kr och ha högst två decimaler. Gränsen för fri frakt ska vara större än 0 och ha högst två decimaler, eller vara `null`, vilket betyder ingen fri frakt. Koden ingår inte, och extra fält tas bort av Zod.
- **`server/routes/adminShipping.ts` (ny):** `GET /api/admin/shipping` listar fraktsätten, och `PUT /api/admin/shipping/:code` sparar namn, pris och gräns. En okänd kod ger 404. Ogiltiga värden ger 400 med ett fel per fält, så att formuläret kan visa felet under rätt fält.
- **`server/app.ts`:** routen är monterad på `/api/admin/shipping` bakom `requireAuth`, som de andra adminroutes.

**Sidan i admin**

- **`src/pages/AdminShippingPage.tsx` (ny)** på `/admin/frakt`, med länken "Frakt" i adminmenyn (`src/components/AdminLayout.tsx`) och en route i `src/App.tsx`.
- Ett kort per fraktsätt, "Ombud och paketbox" och "Hemleverans", med fälten "Namn som kunden ser", "Pris (kr)" och "Fri frakt från (kr)", och en egen knapp "Spara".
- Beloppen kan skrivas med komma eller punkt, "49,90" eller "49.90". Ett tomt fält för fri frakt betyder ingen fri frakt.
- Egen validering med samma regler som servern, och felen under fälten. Inga bubblor från webbläsaren (`noValidate`). Servern kontrollerar ändå igen, och dess fel visas på samma sätt.
- "Sparat" visas efter lyckad sparning, på en rad som alltid finns, så att formuläret inte hoppar.
- Överst står: "Ändringar gäller nya ordrar. Gamla ordrar behåller fraktpriset de fick. Lämna fri frakt tomt om fraktsättet aldrig ska vara gratis."
- Formulären återanvänder stilarna från produktformuläret (`.admin-product-form`). Det nya i `src/index.css` använder bara designvariablerna.

**Tester**

`server/lib/shippingPrice.test.ts`: 8 nya tester för schemat. Giltiga värden med trimmat namn, tom gräns, pris 0, negativt pris, fler än två decimaler, decimaler som 49,90, gräns 0, tomt namn, text i stället för tal, saknad gräns, och att koden inte kan ändras.

**Resultat:** typkontrollen utan fel för frontend och server, 111 av 111 tester godkända, och lint med bara de två gamla varningarna. Inga långa streck eller pilar i koden.

**Prova i webbläsaren**

1. Logga in i admin och öppna "Frakt". Ombud ska stå på 69 kr med fri frakt från 399 kr, och hemleverans på 139 kr med fri frakt från 499 kr.
2. Ändra priset för ombud till 59 och spara. "Sparat" ska visas.
3. Öppna kassan med en varukorg under gränsen och skriv ett postnummer: ombud ska kosta 59 kr. En gammal order ska fortfarande visa sitt gamla fraktpris i admin.
4. Prova ett negativt pris och "abc": felen ska visas under fältet utan att något sparas.
5. Töm fältet för fri frakt och spara. Kassan ska då aldrig visa fri frakt för det fraktsättet, och raden "Handla för ... till för fri frakt" ska försvinna.
6. Sätt tillbaka 69 kr och 399 kr.

**Läge för commit**

Steg 12 lägger till `server/routes/adminShipping.ts`, `src/pages/AdminShippingPage.tsx`, och ändringar i `server/app.ts`, `server/lib/shippingPrice.ts`, `shippingPrice.test.ts`, `src/App.tsx`, `src/components/AdminLayout.tsx` och `src/index.css`, utöver filerna från steg 7 till 11.

Kvar i huvudplanen: steg 13, produktion (nycklarna på Vercel, deploy och "Klart när"), och steg 14, README.

---

## Prompt 44 (30 okt 2026)

> Det funkar, postnords nycklar ligger redan i vercel. Jag gjorde det innan.

### Svar

Bra. Då är adminsidan för fraktpriser provad.

**Läget inför produktion**

- **Nycklar:** `POSTNORD_API_URL` och `POSTNORD_API_KEY` finns på Vercel. `SHOP_POSTAL_CODE`, `SHIPPING_CUTOFF_HOUR` och `SHIPPING_HANDOVER_HOUR` behövs inte där, eftersom koden har 39365, 12 och 14 som standardvärden.
- **Databasen:** den delas mellan lokalt och produktion, så `shipping_methods` och de nya kolumnerna på `orders` finns redan.
- **Git:** `.env`, `.env.postnord` och `dist` ignoreras, så inga nycklar följer med.

**Förslag för steg 13**

1. **Bygget lokalt.** Jag kör `npm run build`, som är `tsc -b` och `vite build`. Vercel kör bara `vite build`, så typkontrollen av hela projektet görs bara här. Det läser ingen `.env`.
2. **Commit och push,** som du gör själv. Det är steg 7 till 12 och loggen.
3. **Deploy:** du kör `npx vercel --prod` från projektmappen.
4. **"Klart när" i den deployade butiken:**
   1. Kassan visar fraktpris för ombud och hemleverans, beräknad leverans, och ombud och paketboxar nära postnumret.
   2. Frakten blir 0 kr när varukorgen når gränsen, 399 kr för ombud.
   3. Ett testköp: valt ombud och fraktpris syns på ordern i admin och på tacksidan.
   4. Beloppet i Stripe är varor plus frakt.
   5. Ett ombud som inte finns för postnumret avvisas med ett begripligt fel. Kassan visar bara giltiga ombud, så det prövas genom att skicka en order direkt i webbläsarens konsol på den deployade sidan:

      ```js
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Test',
          customer_email: 'test@example.com',
          customer_phone: '0701234567',
          shipping_street: 'Testgatan 1',
          shipping_postal_code: '39365',
          shipping_city: 'Kalmar',
          shipping_method: 'ombud',
          service_point_id: '999999999',
        }),
      })
        .then((res) => res.json())
        .then(console.log)
      ```

      Svaret ska vara `{ status: 'fel', field: 'service_point_id', error: 'Det valda ombudet finns inte för ditt postnummer. Välj ett annat.' }`. Ingen order skapas, eftersom ombudet kontrolleras innan ordern sparas.

   6. Ingen PostNord-nyckel i webbläsaren: jag hämtar alla JavaScript-filer från den deployade butiken och söker efter nyckeln, med ett skript som bara laddar `.env.postnord` och aldrig skriver ut nyckeln. Skriptet söker också efter `atapi2.postnord` och `apikey`, som inte heller ska finnas i webbläsarens kod.
   7. README:n om AI kommer i steg 14.

Får jag börja med punkt 1, bygget? Kommandot är:

```
cd "D:/Fullstack developer/6. Systemutveckling/fsu25d-systemutveckling-uppgift-1-min-egna-e-handel-csschef" && npm run build
```

---

## Prompt 45 (30 okt 2026)

> Jag kör bygget och deploy till vercel, comittat och pushat. Allt klart. Vi kör steg 4

### Svar

Jag körde de kontroller som inte kräver webbläsaren, med ett skript utanför repot mot `https://chili-ehandel.vercel.app`. Skriptet laddade bara `.env.postnord` och skrev aldrig ut nyckeln.

**Resultat**

1. **`GET /api/shipping/options?postalCode=39365`:** 200, med "Ombud eller paketbox" 69 kr (fri frakt från 399 kr) och "Hemleverans" 139 kr (fri frakt från 499 kr). Men `servicePointStatus` är `unverified`, inga ombud eller paketboxar, och ingen leveranstid.
2. **`GET /api/shipping/options?postalCode=00000`:** samma sak, `unverified`, i stället för "Postnumret finns inte".
3. **`POST /api/orders` med ombud 999999999:** 400 "Varukorgen är tom". Ombudet kunde inte kontrolleras, så servern gick vidare till varukorgen, som var tom eftersom skriptet inte har någon. Ingen order skapades.
4. **Nyckeln i webbläsarens kod:** butiken har en enda JavaScript-fil, och där finns varken nyckeln, `atapi2.postnord`, `apikey` eller `POSTNORD_`. Den punkten i "Klart när" är uppfylld.

**Vad det betyder**

`unverified` betyder att PostNord avvisade anropet (en felkod i 400-serien) eller svarade i en form vi inte känner igen. Det händer här för alla anrop, även för 00000, alltså innan PostNord ens tittar på postnumret. Lokalt fungerar samma kod. Felet ligger därför troligen i hur nycklarna ser ut på Vercel, inte i koden. Saknades de helt hade utfallet blivit `manual`.

Det betyder också att reservlösningen fungerar i produktion: kunden kan beställa, och kassan säger att leveransalternativet inte kunde kontrolleras.

**Så hittar vi felet**

Servern loggar exakt vad PostNord svarade, med nyckeln maskerad. Öppna projektet i Vercel, gå till Logs och sök på "Integrationsfel mot PostNord". Raden visar statuskoden och PostNords förklaring.

Det vanligaste felet är hur värdena är inklistrade. Kontrollera på Vercel att:

- `POSTNORD_API_URL` är exakt `https://atapi2.postnord.com`, utan snedstreck på slutet och utan `/rest`.
- `POSTNORD_API_KEY` är sandlådenyckeln, 32 tecken, utan mellanslag, citattecken eller radbrytning.
- Båda ligger under Production.

En ändring på Vercel gäller först efter en ny deploy.

Klistra gärna in loggraden här. Nyckeln är maskerad i den.

---

## Prompt 46 (30 okt 2026)

> Jag hittade felet tror jag, testa igen

### Svar

Samma kontroll mot den deployade butiken, med samma skript:

1. **`GET /api/shipping/options?postalCode=39365`:** 200. `servicePointStatus` är `found`, med 5 ombud och 5 paketboxar, närmast Ica Supermarket Lindsdal, Kanngjutarvägen 5. Ombud 69 kr och hemleverans 139 kr, båda med beräknad leverans tisdag 3 november. Det stämmer: överlämningen blir måndag kl. 14, eftersom kontrollen gjordes efter kl. 12 på en fredag.
2. **`GET /api/shipping/options?postalCode=00000`:** 400 med "Postnumret finns inte. Kontrollera det." under postnummerfältet.
3. **`POST /api/orders` med ombud 999999999:** 400 med "Det valda ombudet finns inte för ditt postnummer. Välj ett annat." Ombudet kontrolleras innan ordern sparas, så ingen order skapades.
4. **Nyckeln i webbläsarens kod:** fortfarande inga träffar.

**"Klart när" i den deployade butiken**

- Kassan visar fraktpris för ombud och hemleverans, beräknad leverans och ombud nära kundens postnummer: uppfyllt.
- Ett ombud som inte finns för postnumret avvisas med ett begripligt fel: uppfyllt.
- Ingen PostNord-nyckel i webbläsaren: uppfyllt.
- Kvar att visa i webbläsaren: att frakten blir 0 kr vid gränsen, att valt ombud och fraktpris syns på ordern, och att beloppet i Stripe är varor plus frakt. Gör ett testköp med en varukorg under 399 kr och välj ett ombud, och lägg sedan varor för minst 399 kr i varukorgen och kontrollera att ombud visar "Fri frakt".
- README om AI: steg 14.

Vad var felet? Det är bra att få med i README:n under felsökning, och som ett exempel på varför `rejected` loggas som ett integrationsfel.

---

## Prompt 47 (30 okt 2026)

> 1 och 2 verifierade. Det fattades troligtvis ett tecken i api nyckeln på vercel, jag uppdaterade den och därefter fungerade det.

### Svar

Då är alla punkter i "Klart när" som gäller butiken visade i den deployade butiken:

- Kassan visar fraktpris för ombud och hemleverans, beräknad leverans och ombud nära postnumret.
- Frakten blir 0 kr när ordervärdet når gränsen.
- Valt ombud och fraktpris syns på ordern.
- Beloppet i Stripe är varor plus frakt.
- Ett ombud som inte finns för postnumret avvisas med ett begripligt fel.
- Ingen PostNord-nyckel finns i webbläsaren.

Kvar är README:n.

Felet med nyckeln är ett bra exempel för redovisningen. En nyckel som saknar ett tecken ger en felkod i 400-serien från PostNord. Det blev `rejected`, alltså "Integrationsfel mot PostNord" i loggen, inte "PostNord svarar inte". Kassan föll tillbaka på manuell hantering och sa att leveransalternativet inte kunde kontrolleras, och köpet gick fortfarande att genomföra.

**Förslag för steg 14: README**

README:n är skriven i jag-form, och integrationerna har ett avsnitt var med "Val jag har gjort". Förslaget följer samma stil.

1. **"Frakt med PostNord"** under Integrationer: vad kunden ser i kassan, gränssnittet för transportbolag och adaptern, priserna i databasen och hur gränserna för fri frakt räknades fram, att priset räknas på servern och blir en egen rad i Stripe, att ombudet kontrolleras på servern, "Väntar" när PostNord inte svarar, valet av ombud i efterhand i admin, och adminsidan för fraktpriser. Sist "Val jag har gjort".
2. **"Så använde jag AI i labb 5"**, det avsnitt labben kräver, kort:
    - Verktyg: Claude Code i VS Code. Svaren kontrollerades också mot en annan AI.
    - Hur nycklarna skyddades: `.env` blockerad i verktyget, varje kommando godkänt för hand, och testskript som bara laddar `.env.postnord`.
    - Vilka prompter: de viktigaste i korthet, och en länk till hela loggen, `docs/ai-logg-labb5.md`.
    - Vad AI:n föreslog, vad som skilde sig från PostNords dokumentation och hur det löstes: de viktigaste punkterna, och en länk till `docs/postnord-avvikelser.md`.
    - Hur testerna hittade fel: 9 av 56 tester fallerade först, sedan rättades koden.
3. **Kom igång:** PostNord under Konton (Customer plan och nyckel för sandlådan), `npm test`, mappen `db/migrations/`, och hur frakten testas lokalt.
4. **Kommandon:** `npm test`.
5. **Databas:** att `db/schema.sql` beskriver hela strukturen för en ny databas, och att `db/migrations/` innehåller ändringar som körs en gång mot en befintlig databas.
6. **Deploy:** PostNords två variabler på Vercel.
7. **Om något strular:** "Kassan säger att leveransalternativet inte kunde kontrolleras". Sök efter "Integrationsfel mot PostNord" i loggen på Vercel. Hos mig saknades ett tecken i nyckeln.

Ska jag skriva ett utkast i din stil, som du sedan läser igenom och ändrar, eller vill du skriva någon del själv?
