# Tidsplan

Deadline 25 augusti 2026 21:59.

## Planering och grund

| Uppgift | Tidsåtgång (h) | Risk | Status |
| --- | ---: | --- | --- |
| Projektuppsättning | 2 | låg | klar |
| Research och beslut om typ av E-handel | 2 | låg | klar |
| Tidsplan och sitemap | 3 | låg | klar |
| ER-diagram | 3 | låg | klar |
| Grundläggande CSS | 12 | medel | |

## Databas

| Uppgift | Tidsåtgång (h) | Risk | Status |
| --- | ---: | --- | --- |
| Sätta upp Postgres på Supabase | 2 | låg | klar |
| Skapa tabeller enligt ER-diagram | 3 | låg | klar |
| Lägga in de 10 produkterna | 3 | låg | klar |
| Koppla Express till databasen | 3 | medel | klar |

## API

| Uppgift | Tidsåtgång (h) | Risk | Status |
| --- | ---: | --- | --- |
| Lista produkter | 1 | låg | klar |
| Skapa produkt | 1 | låg | klar |
| Redigera produkt | 2 | låg | klar |
| Ta bort produkt | 1 | låg | |
| Skapa order | 3 | medel | |
| Lista ordrar | 2 | låg | |
| Visa enskild order | 1 | låg | |

## Adminsidor

| Uppgift | Tidsåtgång (h) | Risk | Status |
| --- | ---: | --- | --- |
| Översiktssida | 3 | låg | |
| Produktlista | 2 | låg | |
| Skapa produkt | 4 | låg |  |
| Redigera produkt | 2 | låg | |
| Ta bort produkt | 1 | låg | |
| Orderöversikt | 3 | låg | |
| Visa order | 2 | låg | |

## Kundsidor

| Uppgift | Tidsåtgång (h) | Risk | Status |
| --- | ---: | --- | --- |
| Produktlista med bilder och styrka | 3 | låg | |
| Produktmodal med beskrivning | 2 | låg | |
| Lägga i varukorg | 4 | medel | |
| Varukorgssida | 3 | låg | |
| Kassa med namn och e-post | 3 | låg | |
| Orderbekräftelse | 1 | låg | |

## Deploy och testning

| Uppgift | Tidsåtgång (h) | Risk | Status |
| --- | ---: | --- | --- |
| Första deploy till Vercel | 6 | hög | |
| Koppla databasen i produktion | 4 | hög | |
| Testning, buggfix och polish | 8 | låg | |

## VG

Görs efter att G är klart och deployat.

| Uppgift | Tidsåtgång (h) | Risk | Status |
| --- | ---: | --- | --- |
| Varukorgen sparas i databasen | 6 | medel | |
| Inloggning för admin | 8 | medel | |
| Orderstatus i adminvyn | 3 | låg | |

## Summering

| Block | Timmar |
| --- | ---: |
| Planering och grund | 22 |
| Databas | 11 |
| API | 11 |
| Adminsidor | 17 |
| Kundsidor | 16 |
| Deploy och testning | 18 |
| **Summa G** | **95** |
| VG | 17 |
| **Summa totalt** | **112** |

De två posterna med hög risk är båda deploy. Därför görs en första deploy tidigt, innan sidan är färdig, så att problemen dyker upp när det finns tid kvar att lösa dem.

Prioriteringen är att G ska vara helt klart och deployat först. Räcker tiden inte till VG lämnar jag in ett komplett G in istället för ett halvfärdigt VG.
