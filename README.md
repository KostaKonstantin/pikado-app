# Pikado App

> Platforma za upravljanje pikado ligama i turnirima / Darts league and tournament management platform

---

## Sadržaj / Table of Contents

- [🇷🇸 Srpski](#-srpski)
- [🇬🇧 English](#-english)

---

# 🇷🇸 Srpski

## Šta je Pikado App?

Pikado App je SaaS platforma za pikado klubove koja omogućava kompletno upravljanje ligama, turnirima i igračima. Svaki klub ima sopstveni izolovani prostor sa igračima, sezonama, ligama i turnirima. Platforma podržava realno-vremensko praćenje mečeva putem WebSocket konekcije, javne stranice za prikazivanje rezultata na ekranima u klubu, i PDF izvoz tabela i rasporeda.

## Funkcionalnosti

### Klubovi i korisnici
- Registracija i prijava (JWT autentifikacija)
- Svaki korisnik može biti član više klubova
- Sistem pozivnica — administrator šalje pozivnicu putem e-maila, igrač se registruje direktno
- Upravljanje profilom kluba (naziv, logo, lozinka)

### Igrači
- Lista igrača po klubu sa pixel-art avatarima (DiceBear) i sistemom retkosti (obični, retki, epski, legendarni)
- Profil igrača: istorija mečeva, statistike po ligama, napredak po protivnicima
- Tab "Protivnici": napredak meč po meč za svakog protivnika u svakoj ligi

### Sezone
- Organizovanje liga i turnira po sezonama
- Arhiviranje završenih sezona

### Lige
- Kreiranje liga sa konfigurisabilnim formatom (svako sa svakim / dupli krug)
- Čarobnjak za kreiranje (wizard): naziv → igrači → format → raspored
- Automatsko generisanje rasporeda (Circle metod za ravnomerno rotiranje protivnika)
- Dinamičke sesije (Ligaški dani): bira se koji igrači su prisutni i maksimalan broj mečeva po igraču
- Višestruki prolazi u algoritmu raspoređivanja osiguravaju maksimalan broj mečeva
- Zamene igrača (§8 pravilo): pregled i primena zamena sa pregledom uticaja
- Odlaganje mečeva (postpone) sa opcionalnim novim datumom
- Walkover (neopravdan nedolazak) — izgubljen meč za odsutnog igrača
- Tabela sa poenima, pobedama, porazima, setovima
- Matrica mečeva: N×N grid sa statusom svake utakmice, spotlight fokus po igraču, filter po statusu
- PDF izvoz: tabela igrača i rezultati sesija

### Turniri
- Kreiranje turnira (single-elimination bracket)
- Automatsko generisanje žreba
- Prikaz bracket stabla

### Rangiranje
- Globalna rang lista po klubu

### Realno-vremensko praćenje
- WebSocket gateway (Socket.io)
- Javna stranica `/live/[slug]` — bez prijave, za praćenje mečeva
- Javna stranica `/screen/[slug]` — prikaz na TV/ekranu u klubu
- QR kod za brz pristup javnoj stranici

### Ostalo
- Tamna/svetla tema
- Skupljanje/razvlačenje bočne trake
- Mobilni prikaz za sve stranice
- Javna liga stranica: `/public/leagues/[slug]`

## Tehnički stack

| Sloj | Tehnologije |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Stilizovanje | Tailwind CSS v4 |
| State | Zustand |
| HTTP | Axios |
| Grafici | Recharts |
| PDF | jsPDF + jspdf-autotable |
| QR | react-qr-code |
| Real-time | Socket.io-client |
| Backend | NestJS 11, TypeScript |
| ORM | TypeORM |
| Baza | PostgreSQL 16 |
| Auth | JWT (passport-jwt) |
| E-mail | Nodemailer (Gmail SMTP) |
| Real-time | Socket.io (WebSocket gateway) |

## Pokretanje lokalno

### Preduslovi

- Node.js 20+
- Docker i Docker Compose (za bazu podataka)
- npm

### 1. Kloniranje repozitorijuma

```bash
git clone <repo-url>
cd pikado-app
```

### 2. Pokretanje baze podataka

```bash
docker-compose up postgres -d
```

### 3. Podešavanje backend-a

```bash
cd backend
cp .env.example .env   # ili kreirajte .env ručno (vidite tabelu ispod)
npm install
npm run start:dev
```

Backend radi na `http://localhost:3099` (lokalno) ili `http://localhost:3001` (Docker).

### 4. Podešavanje frontend-a

```bash
cd frontend
cp .env.local.example .env.local   # ili kreirajte .env.local ručno
npm install
npm run dev
```

Frontend radi na `http://localhost:3002`.

### Pokretanje svega u Docker-u

```bash
docker-compose up --build
```

| Servis | Port |
|--------|------|
| Frontend | http://localhost:3002 |
| Backend API | http://localhost:3001/api |
| PostgreSQL | localhost:5432 |

## Promenljive okruženja

### Backend `.env`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pikado
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=3099
CORS_ORIGINS=http://localhost:3002
NODE_ENV=development

# E-mail (opcionalno — za pozivnice)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:3002
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3099
NEXT_PUBLIC_WS_URL=http://localhost:3099
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

## Struktura projekta

```
pikado-app/
├── backend/
│   └── src/
│       ├── auth/           # Prijava, registracija, JWT
│       ├── clubs/          # Klubovi i članstva
│       ├── players/        # Igrači i istorija
│       ├── seasons/        # Sezone
│       ├── leagues/        # Lige, raspored, sesije, zamene
│       ├── tournaments/    # Turniri i bracket
│       ├── matches/        # Mečevi
│       ├── rankings/       # Rang liste
│       ├── invites/        # Pozivnice
│       ├── live/           # WebSocket gateway
│       └── common/         # Guards, decorators, enums
├── frontend/
│   └── src/
│       └── app/
│           ├── (auth)/         # Prijava i registracija
│           ├── (dashboard)/    # Zaštićene stranice
│           │   ├── dashboard/
│           │   ├── leagues/
│           │   ├── tournaments/
│           │   ├── players/
│           │   ├── rankings/
│           │   ├── seasons/
│           │   └── settings/
│           ├── live/[slug]/    # Javno praćenje (bez prijave)
│           ├── screen/[slug]/  # TV prikaz (bez prijave)
│           ├── public/         # Javne liga stranice
│           └── invite/[token]/ # Prihvatanje pozivnice
└── docker-compose.yml
```

## Arhitekturalne napomene

- **Izolacija po klubu** — svaki API poziv sadrži `clubId`. `ClubMembershipGuard` proverava da li JWT korisnik ima pristup tom klubu. Nikada se ne preskače.
- **TypeORM `synchronize: true`** — uključeno u razvoju. Za produkciju koristiti migracije.
- **Javne stranice** (`/live`, `/screen`, `/public`) ne zahtevaju JWT — pristupačne direktno sa QR koda.
- **Upload fajlova** — logotipi klubova čuvaju se u `backend/uploads/`, serviran statički na `/uploads`.

---

# 🇬🇧 English

## What is Pikado App?

Pikado App is a SaaS platform for darts clubs that provides complete management of leagues, tournaments, and players. Each club has its own isolated workspace with players, seasons, leagues, and tournaments. The platform supports real-time match tracking via WebSocket, public display pages for venue screens, and PDF exports of standings and schedules.

## Features

### Clubs & Users
- Registration and login (JWT authentication)
- Each user can be a member of multiple clubs
- Invitation system — admin sends an e-mail invite, the player registers directly
- Club profile management (name, logo, password)

### Players
- Player list per club with pixel-art avatars (DiceBear) and a rarity system (common, rare, epic, legendary)
- Player profile: match history, per-league statistics, progress against each opponent
- Opponents tab: match-by-match progress for every opponent in every league

### Seasons
- Organize leagues and tournaments into seasons
- Archive completed seasons

### Leagues
- Create leagues with a configurable format (single round-robin / double round-robin)
- Creation wizard: name → players → format → schedule
- Automatic schedule generation (Circle method for balanced opponent rotation)
- Dynamic sessions (League Nights): select which players are present and max matches per player
- Multi-pass scheduling algorithm guarantees maximum match count even with partial pool rounds
- Player substitutions (§8 rule): preview and apply substitutions with impact preview
- Match postponement with optional new date
- Walkover (unexcused absence) — forfeited match for the absent player
- Standings table with points, wins, losses, sets
- Match matrix: N×N grid showing status of every pair, spotlight focus by player, status filter
- PDF exports: player sheet and session results

### Tournaments
- Create tournaments (single-elimination bracket)
- Automatic draw generation
- Visual bracket tree view

### Rankings
- Global leaderboard per club

### Real-time
- WebSocket gateway (Socket.io)
- Public page `/live/[slug]` — no login required, for live match viewing
- Public page `/screen/[slug]` — display on club TV/screen
- QR code for quick access to the public page

### Other
- Dark/light theme
- Collapsible sidebar
- Mobile-responsive layout across all pages
- Public league page: `/public/leagues/[slug]`

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| HTTP | Axios |
| Charts | Recharts |
| PDF | jsPDF + jspdf-autotable |
| QR | react-qr-code |
| Real-time | Socket.io-client |
| Backend | NestJS 11, TypeScript |
| ORM | TypeORM |
| Database | PostgreSQL 16 |
| Auth | JWT (passport-jwt) |
| Email | Nodemailer (Gmail SMTP) |
| Real-time | Socket.io (WebSocket gateway) |

## Running Locally

### Prerequisites

- Node.js 20+
- Docker and Docker Compose (for the database)
- npm

### 1. Clone the repository

```bash
git clone <repo-url>
cd pikado-app
```

### 2. Start the database

```bash
docker-compose up postgres -d
```

### 3. Set up the backend

```bash
cd backend
cp .env.example .env   # or create .env manually (see table below)
npm install
npm run start:dev
```

Backend runs at `http://localhost:3099` (local) or `http://localhost:3001` (Docker).

### 4. Set up the frontend

```bash
cd frontend
cp .env.local.example .env.local   # or create .env.local manually
npm install
npm run dev
```

Frontend runs at `http://localhost:3002`.

### Run everything with Docker

```bash
docker-compose up --build
```

| Service | Port |
|---------|------|
| Frontend | http://localhost:3002 |
| Backend API | http://localhost:3001/api |
| PostgreSQL | localhost:5432 |

## Environment Variables

### Backend `.env`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pikado
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=3099
CORS_ORIGINS=http://localhost:3002
NODE_ENV=development

# Email (optional — for invitations)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:3002
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3099
NEXT_PUBLIC_WS_URL=http://localhost:3099
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

## Project Structure

```
pikado-app/
├── backend/
│   └── src/
│       ├── auth/           # Login, registration, JWT
│       ├── clubs/          # Clubs and memberships
│       ├── players/        # Players and history
│       ├── seasons/        # Seasons
│       ├── leagues/        # Leagues, schedule, sessions, substitutions
│       ├── tournaments/    # Tournaments and bracket
│       ├── matches/        # Matches
│       ├── rankings/       # Leaderboards
│       ├── invites/        # Invitations
│       ├── live/           # WebSocket gateway
│       └── common/         # Guards, decorators, enums
├── frontend/
│   └── src/
│       └── app/
│           ├── (auth)/         # Login and registration
│           ├── (dashboard)/    # Protected pages
│           │   ├── dashboard/
│           │   ├── leagues/
│           │   ├── tournaments/
│           │   ├── players/
│           │   ├── rankings/
│           │   ├── seasons/
│           │   └── settings/
│           ├── live/[slug]/    # Public live view (no login)
│           ├── screen/[slug]/  # TV display (no login)
│           ├── public/         # Public league pages
│           └── invite/[token]/ # Invite acceptance
└── docker-compose.yml
```

## Architectural Notes

- **Club isolation** — every API call includes a `clubId`. The `ClubMembershipGuard` verifies the JWT user has access to that club. Never skipped.
- **TypeORM `synchronize: true`** — enabled in development. Use migrations for production.
- **Public pages** (`/live`, `/screen`, `/public`) require no JWT — directly accessible via QR code.
- **File uploads** — club logos are stored in `backend/uploads/`, served statically at `/uploads`.

## License

Private — all rights reserved.
