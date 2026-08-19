# Tidsplan

Deadline 25 augusti 2026 21:59.

## Planering och grund

| Uppgift                                | Tidsåtgång (h) | Risk  | Status | Faktisk tid |
| -------------------------------------- | -------------: | ----- | ------ | ----------- |
| Projektuppsättning                     |              2 | låg   | klar   | 1           |
| Research och beslut om typ av E-handel |              2 | låg   | klar   | 1           |
| Tidsplan och sitemap                   |              3 | låg   | klar   | 2           |
| ER-diagram                             |              3 | låg   | klar   | 1 ½         |
| Grundläggande CSS                      |             12 | medel |        | 6           |

## Databas

| Uppgift                          | Tidsåtgång (h) | Risk  | Status | Faktisk tid |
| -------------------------------- | -------------: | ----- | ------ | ----------- |
| Sätta upp Postgres på Supabase   |              2 | låg   | klar   | 1           |
| Skapa tabeller enligt ER-diagram |              3 | låg   | klar   | 2           |
| Lägga in de 10 produkterna       |              3 | låg   | klar   | ½           |
| Koppla Express till databasen    |              3 | medel | klar   | 1           |

## API

| Uppgift            | Tidsåtgång (h) | Risk  | Status | Faktisk tid |
| ------------------ | -------------: | ----- | ------ | ----------- |
| Lista produkter    |              1 | låg   | klar   | 1           |
| Skapa produkt      |              1 | låg   | klar   | ½           |
| Redigera produkt   |              2 | låg   | klar   | ½           |
| Ta bort produkt    |              1 | låg   | klar   | ½           |
| Skapa order        |              3 | medel | klar   | 1           |
| Lista ordrar       |              2 | låg   |        |             |
| Visa enskild order |              1 | låg   |        |             |

## Adminsidor

| Uppgift          | Tidsåtgång (h) | Risk | Status | Faktisk tid |
| ---------------- | -------------: | ---- | ------ | ----------- |
| Översiktssida    |              3 | låg  | klar   | 1           |
| Produktlista     |              2 | låg  | klar   | 1           |
| Skapa produkt    |              4 | låg  | klar   | 1 ½         |
| Redigera produkt |              2 | låg  | klar   | 1 ½         |
| Ta bort produkt  |              1 | låg  | klar   | 1           |
| Orderöversikt    |              3 | låg  |        |             |
| Visa order       |              2 | låg  |        |             |

## Kundsidor

| Uppgift                                       | Tidsåtgång (h) | Risk  | Status | Faktisk tid |
| --------------------------------------------- | -------------: | ----- | ------ | ----------- |
| Produktlista med bilder och styrka            |              3 | låg   | klar   | 2           |
| Produktinfo med beskrivning och näringsvärden |              2 | låg   | klar   | 1           |
| Lägga i varukorg                              |              4 | medel | klar   | 2           |
| Varukorgssida                                 |              3 | låg   | klar   | 1 ½         |
| Kassa med namn och e-post                     |              3 | låg   | klar   | 1 ½         |
| Orderbekräftelse                              |              1 | låg   | klar   | ½           |

## Deploy och testning

| Uppgift                       | Tidsåtgång (h) | Risk | Status | Faktisk tid |
| ----------------------------- | -------------: | ---- | ------ | ----------- |
| Första deploy till Vercel     |              6 | hög  | klar   | 2           |
| Koppla databasen i produktion |              4 | hög  | klar   | 1           |
| Testning, buggfix och polish  |              8 | låg  |        | 3           |

## Saker jag glömde skriva i tidsplanen från början, men som gjordes

| Uppgift                                      | Tidsåtgång (h) | Risk  | Status | Faktisk tid |
| -------------------------------------------- | -------------: | ----- | ------ | ----------- |
| Header/Footer                                |            N/A | låg   | klar   | 1           |
| Bildgenerering och bearbetning för produkter |            N/A | medel | klar   | 6           |
| Counter på kassa-ikonen                      |            N/A | medel | klar   | 2           |
| Routing (react-router, layout-routes)        |            N/A | låg   | klar   | 2           |

## VG

Görs efter att G är klart och deployat.

| Uppgift                       | Tidsåtgång (h) | Risk  | Status | Faktisk tid |
| ----------------------------- | -------------: | ----- | ------ | ----------- |
| Varukorgen sparas i databasen |              6 | medel | klar   | 2           |
| Inloggning för admin          |              8 | medel | klar   | 3           |
| Orderstatus i adminvyn        |              3 | låg   |        |             |

## Summering

| Block               |  Timmar |
| ------------------- | ------: |
| Planering och grund |      22 |
| Databas             |      11 |
| API                 |      11 |
| Adminsidor          |      17 |
| Kundsidor           |      16 |
| Deploy och testning |      18 |
| **Summa G**         |  **95** |
| VG                  |      17 |
| **Summa totalt**    | **112** |

De två posterna med hög risk är båda deploy. Därför görs en första deploy tidigt, innan sidan är färdig, så att problemen dyker upp när det finns tid kvar att lösa dem.

Prioriteringen är att G ska vara helt klart och deployat först. Räcker tiden inte till VG lämnar jag in ett komplett G in istället för ett halvfärdigt VG.

Ser att jag kommer hinna med G så jag har börjat ta vissa VG-delar paralellt för att slippa refaktorera och bygga det när jag ändå gör berörda G-delar.
