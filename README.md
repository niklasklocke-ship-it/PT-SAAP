# PT-SAAP

App for Personal trainers to organize Booking, Payment, Administration and trainings

MVP-Backend für ein SaaS-Produkt, das Personal Trainer entweder als
Website-Widget oder als eigenständige App nutzen können. Beide Kanäle
sprechen dieselbe zentrale API.

## Struktur

```
apps/
  api/                    NestJS-Backend (API-first, multi-tenant)
    prisma/schema.prisma  Datenmodell (siehe ER-Diagramm aus der Konzeptphase)
    src/
      auth/               Registrierung/Login pro Trainer (= Tenant), JWT
      customers/          Kundenverwaltung (CRUD, tenant-gescoped)
      services/           Leistungen/Pakete (Einzelstunde, 10er-Karte, Abo)
      appointments/        Terminverwaltung inkl. Überschneidungsprüfung
      customer-packages/  Gekaufte Pakete/Abos + Guthaben-Verbrauch
      invoices/           Rechnungen mit fortlaufender Rechnungsnummer
      payments/           Zahlungen + Stripe-Webhook-Stub
      public/             Öffentliche Endpunkte für Widget/App (API-Key statt Login)
      exercise-logs/      Fortschritts-/Gewichtstracking pro Übung und Kunde
      training-plans/     Strukturierter Trainingsplan (Tage/Abschnitte/Übungen)
      google-calendar/    OAuth-Anbindung + Sync von Terminen zu Google Calendar
      common/             Guards (JWT, API-Key) und Decorators
  web/                    Next.js-Frontend (Trainer-Dashboard)
docker-compose.yml        Lokale Postgres- und Redis-Instanz
```

## Setup

1. Abhängigkeiten installieren:
   ```
   cd apps/api
   npm install
   ```
2. Lokale Datenbank starten:
   ```
   docker compose up -d postgres redis
   ```
3. `.env` aus `.env.example` anlegen und `DATABASE_URL`/`JWT_SECRET` prüfen.
4. Migration ausführen:
   ```
   npm run prisma:migrate
   ```
5. Server starten:
   ```
   npm run start:dev
   ```
   Die API läuft danach auf `http://localhost:3001`.

## Zwei Zugriffsarten auf die API

- **Trainer-Dashboard (Login nötig):** `POST /auth/register`, `POST /auth/login`
  liefern ein JWT. Alle Endpunkte unter `/customers`, `/services`,
  `/appointments`, `/invoices` etc. erwarten `Authorization: Bearer <token>`.
- **Widget/Kunden-App (kein Login):** Endpunkte unter `/public/*` erwarten
  stattdessen den Header `x-api-key: <publicApiKey>` des jeweiligen Trainers
  (wird bei Registrierung automatisch erzeugt, abrufbar über die
  Login-Antwort unter `tenant.publicApiKey`).

## Kurzer Testlauf (curl)

```bash
# Trainer registrieren
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Max Mustermann","email":"max@example.com","password":"supersicher123"}'

# Antwort enthält accessToken und tenant.publicApiKey - beide für die
# folgenden Requests verwenden.

# Leistung anlegen (mit accessToken)
curl -X POST http://localhost:3001/services \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Personal Training Einzelstunde","price":60,"durationMin":60,"type":"SINGLE"}'

# Termin über den öffentlichen Endpunkt buchen (mit publicApiKey, wie es
# das Widget später tun würde)
curl -X POST http://localhost:3001/public/appointments \
  -H "x-api-key: <publicApiKey>" \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Anna Kunde","customerEmail":"anna@example.com","serviceId":"<serviceId>","startTime":"2026-08-01T09:00:00.000Z","endTime":"2026-08-01T10:00:00.000Z"}'
```

## Frontend (apps/web)

Next.js-Trainer-Dashboard: Login/Registrierung, Kundenliste inkl.
Trainingsziele/Trainingsplan (Accordion mit Drag&Drop)/Fortschritts-Tracking,
Kalender (Monatsansicht) und Rechnungen.

```
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

Läuft danach auf `http://localhost:3000` und erwartet die API unter der in
`NEXT_PUBLIC_API_URL` konfigurierten Adresse (Standard: `http://localhost:3001`).
Kein Widget-Bundle enthalten – das würde auf `/public/*` aufsetzen.

## Google-Calendar-Sync einrichten

Termine können optional mit dem Google Calendar des Trainers synchronisiert
werden (einseitig automatisch bei Anlegen/Ändern/Löschen eines Termins, plus
ein manueller "Jetzt synchronisieren"-Button für Änderungen, die der Trainer
direkt in Google vorgenommen hat).

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein
   Projekt anlegen und die **Google Calendar API** aktivieren.
2. Unter "APIs & Services" → "OAuth consent screen" einen Consent-Screen
   konfigurieren (App-Name, Testnutzer für den Entwicklungsmodus reichen).
3. Unter "Credentials" eine **OAuth-Client-ID** vom Typ "Web application"
   erzeugen. Als "Authorized redirect URI"
   `http://localhost:3001/google-calendar/callback` eintragen.
4. Client-ID und Client-Secret in `apps/api/.env` eintragen
   (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
5. Im Trainer-Dashboard unter "Kalender" auf "Google Calendar verbinden"
   klicken.

Ohne diese Variablen bleibt der Button sichtbar, aber die Verbindung schlägt
fehl (Google lehnt die Anfrage mangels gültiger `client_id`/`redirect_uri` ab).

## Bewusste Vereinfachungen im MVP (nächste Schritte)

- Google-Calendar-Sync deckt nur Google ab (kein Outlook/Microsoft 365) und
  hat keinen automatischen Hintergrundabgleich für Änderungen aus Google -
  das bräuchte entweder Webhooks (öffentlich erreichbare HTTPS-Callback-URL)
  oder einen Polling-Scheduler. Neu direkt in Google angelegte Termine werden
  nicht automatisch in PT-SaaS übernommen (fehlende Kunde/Leistung-Zuordnung).
- E-Mail/SMS-Erinnerungen und DATEV-Export sind noch nicht implementiert.
