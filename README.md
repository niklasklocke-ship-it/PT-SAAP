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
      common/             Guards (JWT, API-Key) und Decorators
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

## Bewusste Vereinfachungen im MVP (nächste Schritte)

- Rechnungsnummer-Vergabe ist noch nicht race-condition-sicher (siehe Kommentar
  in `invoices/invoices.service.ts`) – für Produktion per DB-Transaktion/Lock lösen.
- Kein Next.js-Frontend und kein Widget-Bundle enthalten – beide würden auf
  `/public/*` (Widget) bzw. `/auth`, `/customers`, `/appointments` etc.
  (Trainer-Dashboard) aufsetzen.
- Kalender-Sync (Google/Outlook), E-Mail/SMS-Erinnerungen und DATEV-Export
  sind noch nicht implementiert.
