[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/r1QxwNOh)

# Vikingsås

E-handel med tio chilisåser i stigande styrka. Skoluppgift i kursen Systemutveckling.

Sajten ligger på https://chili-ehandel.vercel.app

React och Vite i frontend, Express och TypeScript i API:et, Postgres hos Supabase, deploy på Vercel.

## Kom igång

Installera beroenden:

```
npm install
```

Kopiera `.env.example` till `.env` och fyll i `DATABASE_URL`.

Starta sedan två terminaler, en för frontend och en för API:et:

```
npm run dev
npm run dev:api
```

Frontend hamnar på http://localhost:5173 och API:et på http://localhost:3000. Vite skickar vidare allt som börjar med `/api` till Express, så webbläsaren ser bara en adress och jag slipper CORS.

## Kommandon

| Kommando | Gör |
| --- | --- |
| `npm run dev` | startar frontend |
| `npm run dev:api` | startar API:et, läser `.env` och startar om vid ändring |
| `npm run build` | typkontroll med `tsc -b`, sedan bygger frontend |
| `npm run preview` | visar det byggda resultatet lokalt |
| `npm run lint` | kör oxlint |
| `npx vercel --prod` | deployar till produktion |

## Databas

SQL:en körs manuellt i Supabase SQL editor, det finns ingen automatisk migrering.

- `db/schema.sql` skapar tabellerna
- `db/seed.sql` lägger in de tio produkterna. Körs bara en gång, `title` är inte unik så en andra körning ger dubbletter

Supabase-projektet får inte pausas, då slutar den deployade butiken visa produkter.

## Deploy

Vercel är inte kopplat till GitHub eftersom projektet ligger på Medieinstitutets konto, CLI:n laddar upp filerna som ligger på disk. Därför gäller ordningen:

```
git commit -am "..."
git push
npx vercel --prod
```

Hoppa inte över push, annars börjar produktionen och repot skilja sig åt.

Kontrollera efteråt att API och databas svarar, https://chili-ehandel.vercel.app/api/health ska ge:

```
{"status":"ok","products":10}
```

Vercel kör `vite build` i molnet, inte `npm run build`. Typkontrollen sker alltså bara lokalt, körs innan deploy.

## Om något strular

**`Error: Not authorized` vid deploy.** Inloggningen är borta. Kör `npx vercel login`, välj GitHub, kontrollera sedan med `npx vercel whoami`.

**npx vill installera `vercel` igen.** Normalt, inget fel. npx cachar paketet och hämtar senaste versionen när cachen är tom.

**Produkterna syns inte på sajten.** Kolla `/api/health` först. Svarar den med ett felmeddelande ligger problemet i databasen, inte i frontend.

## Dokumentation

Tidsplan, sitemap och ER-diagram ligger i [docs/](docs/).
