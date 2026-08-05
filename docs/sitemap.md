# Sitemap

Sidorna i butiken och vad de gör.

## Kundsidor

| Adress | Sida | Innehåll |
| --- | --- | --- |
| `/` | Startsida | Listar alla produkter med bild, titel, styrka, volym och pris. Knapp för att lägga i varukorgen. |
| `/varukorg` | Varukorg | Valda produkter, antal, radsummor och totalsumma. Går vidare till kassan. |
| `/kassa` | Kassa | Formulär med namn och e-post. Skickar ordern. |
| `/tack` | Orderbekräftelse | Ordernummer och en sammanfattning av det som beställts. |

Beskrivningen av en produkt visas i en modal på startsidan, inte på en egen sida för att förenkla då detaljsida inte är ett krav.
Modalen öppnas när man klickar på en produkt och har därför ingen egen adress. Alternativt flippar kortet med en animation för att visa beskrivning på baksidan? Tror ej det, men får se.

Modalen visar beskrivning, ingredienser och näringsvärden per 100 ml.

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

