# Sitemap

Sidorna i butiken och vad de gör.

## Kundsidor

| Adress | Sida | Innehåll |
| --- | --- | --- |
| `/` | Startsida | En sektion per produkt med bild, titel, styrka, volym, pris och beskrivning. Knapp för att lägga i varukorgen. |
| `/varukorg` | Varukorg | Valda produkter, antal, radsummor och totalsumma. Går vidare till kassan. |
| `/kassa` | Kassa | Formulär med namn och e-post. Skickar ordern. |
| `/tack` | Orderbekräftelse | Ordernummer och en sammanfattning av det som beställts. |

Ingen egen detaljsida per produkt, eftersom det inte är ett krav. Beskrivningen ligger istället direkt i produktens sektion på startsidan, och ingredienser och näringsvärden per 100 ml i en hopfällbar ruta i samma sektion.

## Adminsidor

| Adress | Sida | Innehåll |
| --- | --- | --- |
| `/admin` | Översikt | Ingång till produkter och ordrar. |
| `/admin/produkter` | Produktlista | Alla produkter med knappar för att redigera och ta bort. |
| `/admin/produkter/ny` | Skapa produkt | Formulär med titel, beskrivning, volym, pris, chilistyrka, bildadress, ingredienser och de åtta näringsvärdena. |
| `/admin/produkter/:id/redigera` | Redigera produkt | Samma formulär, ifyllt. |
| `/admin/ordrar` | Orderöversikt | Alla ordrar med kund, datum och summa. |
| `/admin/ordrar/:id` | Visa order | En order med alla rader, priser och totalsumma. |

## Tillkommer vid VG

| Adress | Sida | Innehåll |
| --- | --- | --- |
| `/admin/login` | Inloggning | Endast administratörer kommer åt adminsidorna. |

