# Highlands Motel & Cafe

Full-stack web application for a motel and cafe in Surkhet, Nepal. Built with **Vite + React 19** (frontend) and **InsForge Deno edge functions** (backend), with **Fonepay** payment gateway integration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vite (rolldown) + React 19 + TypeScript 5.9 |
| **Styling** | Tailwind CSS 3 + PostCSS |
| **Routing** | React Router v7 |
| **Forms** | React Hook Form + Zod validation |
| **Backend** | InsForge Deno edge functions (7 functions) |
| **Database** | InsForge/PostgreSQL (10 migrations) |
| **Payments** | Fonepay QR + Fonepay Web + Pay at Property |
| **Auth** | InsForge Auth (JWT) |
| **Emails** | Resend API |
| **SEO** | react-helmet-async |
| **Charts** | Chart.js (admin dashboard) |
| **Build** | tsc + eslint + vite build |

---

## Project Structure

```
highlands-motel/
├── src/
│   ├── main.tsx                   # App entry
│   ├── App.tsx                    # Router + layout
│   ├── index.css                  # Global styles
│   ├── components/
│   │   └── common/                # Navbar, Footer, SEO, ErrorBoundary, LoadingFallback
│   ├── pages/
│   │   ├── Home, About, Rooms, RoomDetails, Booking, Cafe,
│   │   │   Menu, Contact, FAQ, Terms, Privacy, PaymentResult
│   │   └── admin/                 # Dashboard, Bookings, Rooms, Menu,
│   │                               # CafeOrders, Images, ContentEditor,
│   │                               # PaymentRecovery, AdminGate, Login, Signup
│   ├── services/                  # InsForge client, auth, booking, room,
│   │                               # fonepay, menu, order, content, storage
│   └── utils/                     # CSV export
├── insforge/functions/            # 7 Deno edge functions
├── migrations/                    # 10 SQL migrations
├── env.example                    # Environment template
├── graphify-out/                  # Knowledge graph (for AI tools)
└── TEST_REPORT.md                 # QA audit report
```

---

## Edge Functions

| Function | Description | Rate Limit | Auth |
|----------|-------------|-----------|------|
| `create-booking` | Create room booking with conflict detection | 10/min | Public |
| `fonepay-payment` | QR/Web payment generation & verification | 20/min | Session + Admin |
| `place-cafe-order` | Cafe order placement (server-side pricing) | 20/min | Public |
| `admin-recover-payment` | Force-confirm/expire/resolve stuck payments | 10/min | Admin JWT |
| `payment-reconciliation` | Automated stuck payment resolution | — | Internal |
| `pos-sync-api` | POS data sync endpoint | — | API Key |
| `sync-webhook-sender` | Webhook sync distribution | — | Internal |

---

## Booking Flow

1. **Select dates** → availability check against existing bookings
2. **Guest info** → Zod-validated name, email, phone
3. **Payment method**: Fonepay QR, Fonepay Web, or Pay at Property (60% advance)
4. **Payment**: QR (polling + WebSocket) or Web (redirect + verify)
5. **Confirmation**: atomic `confirm_booking_payment` RPC → email via Resend

---

## Security Controls

- JWT session verification (all payment operations)
- Admin role + email check (recovery/refund endpoints)
- Zod input validation on every API entry point
- HMAC-SHA512 payload signing (Fonepay API)
- Server-side price calculation (client-provided amounts ignored)
- Amount integrity check (Fonepay response vs DB)
- Atomic `confirm_booking_payment` RPC with `FOR UPDATE` locks
- Idempotency — duplicate verifications return "already verified"
- Rate limiting (10–20 req/min per IP)
- 64KB body size limits on all functions
- CORS origin allowlist
- PRN uniqueness (crypto.randomUUID + DB constraint)
- Booking hold auto-expiry (15 min → 30 min max via reconciliation)
- Audit event logging (`payment_events` table)

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp env.example .env
# Fill in your InsForge URL, anon key, Fonepay credentials, Resend API key

# Development
npm run dev

# Lint & build
npm run lint
npm run build
```

---

## Migrations

10 sequential SQL migrations in `/migrations/` covering:
- Cafe ordering schema (001)
- POS sync (002)
- Room metadata (003–006)
- Payment tables + hardening (007–010)
- Order counter fix + double-booking prevention (011–012)

---

## QA Status

**Health Score: 65/100** — tested across 7 phases (smoke, functional, integration, UI, load, stress, security). Full report in `TEST_REPORT.md`.

---

## License

MIT
