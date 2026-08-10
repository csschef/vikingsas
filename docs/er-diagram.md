# ER-diagram

Ritningen ligger i `er-diagram.webp`, källfilen i `er-diagram.drawio`. Rutorna i ritningen visar bara kolumnnamnen, så typer och regler står här istället.

Endast tre tabeller behövs för G: `products`, `orders` och `order_items`. Jag ritade även in VG-delen så får jag se om jag hinner med den.

## products

| Kolumn | Typ | Regler |
| --- | --- | --- |
| `id` | SERIAL | primärnyckel |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | |
| `volume_ml` | INTEGER | NOT NULL |
| `price` | NUMERIC(10,2) | NOT NULL |
| `heat_level` | INTEGER | NOT NULL, CHECK mellan 1 och 10 då det är skalan jag valt på chilisåserna |
| `image_url` | TEXT | |
| `ingredients` | TEXT | |
| `energy_kj` | INTEGER | |
| `energy_kcal` | INTEGER | |
| `fat_g` | NUMERIC(6,2) | |
| `saturated_fat_g` | NUMERIC(6,2) | |
| `carbohydrate_g` | NUMERIC(6,2) | |
| `sugars_g` | NUMERIC(6,2) | |
| `protein_g` | NUMERIC(6,2) | |
| `salt_g` | NUMERIC(6,2) | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true |

Näringsvärdena gäller per 100 ml. Bara titel, volym, pris och styrka är obligatoriska, så admin kan spara en produkt innan alla siffror från etiketten är inskrivna.

## orders

| Kolumn | Typ | Regler |
| --- | --- | --- |
| `id` | SERIAL | primärnyckel |
| `customer_name` | TEXT | NOT NULL |
| `customer_email` | TEXT | NOT NULL |
| `total_amount` | NUMERIC(10,2) | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

Ingen koppling till `users`. Kunden loggar aldrig in utan handlar som gäst, så namn och e-post skrivs in i kassan och sparas på ordern.

## order_items

| Kolumn | Typ | Regler |
| --- | --- | --- |
| `id` | SERIAL | primärnyckel |
| `order_id` | INTEGER | NOT NULL, FK mot `orders.id`, ON DELETE CASCADE |
| `product_id` | INTEGER | NOT NULL, FK mot `products.id` |
| `product_title` | TEXT | NOT NULL |
| `unit_price` | NUMERIC(10,2) | NOT NULL |
| `quantity` | INTEGER | NOT NULL, CHECK större än 0 |

Titel och pris kopieras hit när ordern skapas och ändras aldrig efteråt. Ingen radsumma sparas, den räknas som `unit_price * quantity`.

## carts (VG)

| Kolumn | Typ | Regler |
| --- | --- | --- |
| `id` | SERIAL | primärnyckel |
| `session_id` | TEXT | NOT NULL, UNIQUE |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

`session_id` är sessionens id men ingen främmande nyckel. UNIQUE ger en korg per session.

## cart_items (VG)

| Kolumn | Typ | Regler |
| --- | --- | --- |
| `id` | SERIAL | primärnyckel |
| `cart_id` | INTEGER | NOT NULL, FK mot `carts.id`, ON DELETE CASCADE |
| `product_id` | INTEGER | NOT NULL, FK mot `products.id` |
| `quantity` | INTEGER | NOT NULL, CHECK större än 0 |

UNIQUE på `cart_id` och `product_id` tillsammans. Samma produkt får bara ligga på en rad per korg, antalet räknas upp i `quantity` istället.

Inget pris och ingen titel här. Korgen visar nuläget och hämtar priset från `products` varje gång den visas.

## users (VG)

| Kolumn | Typ | Regler |
| --- | --- | --- |
| `id` | SERIAL | primärnyckel |
| `email` | TEXT | NOT NULL, UNIQUE |
| `password_hash` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

Jag låter alla konton vara administratörer, och behöver därför ingen kolumn för roll. Lösenordet lagras som bcrypt-hash, aldrig i klartext.

## session (VG)

Skapas av `connect-pg-simple`, inte av mig. Tabellnamnet är i singular till skillnad från de andra.

| Kolumn | Typ | Regler |
| --- | --- | --- |
| `sid` | VARCHAR | primärnyckel |
| `sess` | JSON | NOT NULL |
| `expire` | TIMESTAMP(6) | NOT NULL |

Sessionen måste ligga i databasen eftersom Vercel kör serverless. Varje anrop kan hamna i en ny process, och då försvinner allt som sparats i serverns minne.

## Relationer

| Från | Till | Kardinalitet | Vid radering |
| --- | --- | --- | --- |
| `order_items.order_id` | `orders.id` | en order har en eller flera rader | CASCADE |
| `order_items.product_id` | `products.id` | en produkt ligger på noll eller flera rader | vägras |
| `cart_items.cart_id` | `carts.id` | en korg har noll eller flera rader | CASCADE |
| `cart_items.product_id` | `products.id` | en produkt ligger på noll eller flera rader | vägras |

En order utan rader ska aldrig finnas, men det går inte att tvinga fram i databasen. Order och orderrader skapas därför i en transaktion, så att antingen allt eller ingenting sparas.

`users` och `session` står fristående utan relationer.

## Val jag gjort och varför

**Pris som NUMERIC, inte float.** Flyttal räknar inte exakt och pengar måste stämma på öret.

**Titel och pris fryses på orderraden.** Annars skulle en gammal order visa ett nytt pris när jag redigerar produkten, och kunden betalade något annat.

**Totalsumman sparas på ordern.** Samma tanke. Beloppet är vad kunden godkände i kassan och ska inte räknas om i efterhand.

**Styrkan som heltal 1 till 10 med CHECK.** Siffran står tryckt på flaskan och nivåerna har inga namn, så en egen tabell hade blivit tom.

**Soft delete på produkter.** `is_active` sätts till false istället för att raden tas bort. Kundens produktlista filtrerar på `is_active`, adminlistan visar allt. Gör att gamla ordrar behåller sin koppling till produkten.

**Ingredienser som fritext.** Listan kommer från etiketten och söks aldrig per ingrediens.

**Näringsvärden som kolumner.** Hade detta varit en riktig e-handel så hade det krävts exakt de här posterna och uppsättningen varierar aldrig, så det finns inget att bryta ut.
