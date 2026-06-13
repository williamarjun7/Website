# Highlands Motel & Cafe

A full-stack hospitality website for Highlands Motel & Cafe in Surkhet, Nepal. Features room booking with Fonepay payment, read-only cafe menu display, and an admin management panel.

> **Cafe ordering is handled by an external POS system.** This website is a digital menu board only — no ordering, cart, checkouts, or payment processing for cafe items.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** InsForge (PostgreSQL, Auth, Storage, Edge Functions)
- **Payments:** Fonepay (QR + web redirect)
- **Email:** Resend
- **Deployment:** Netlify / Vercel

## Features

### Public
- Browse rooms with filters (AC, type, price)
- Multi-step booking with date picker & availability check
- Pay at property (60% advance) or Fonepay (QR/web)
- Cafe menu browsing (read-only menu board — ordering via external POS)
- About, Contact, FAQ, Terms, Privacy pages
- Hero image slideshow

### Admin (`/admin`)
- Dashboard with stats, revenue, occupancy, recent bookings
- Manage rooms, room images, pricing, availability
- Manage cafe menu categories & items
- Upload hero slideshow images
- Edit dynamic site content
- Payment recovery (force-confirm/expire stuck bookings)
- CSV export for bookings

## Getting Started

### Prerequisites

- Node.js 18+
- An [InsForge](https://insforge.dev) project (database, auth, storage, edge functions)
- Fonepay merchant account (for payments)
- Resend API key (for email notifications)

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp env.example .env
# Fill in your InsForge URL/keys, Fonepay credentials, etc.

# Start dev server
npm run dev
```

### Environment Variables

See `env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `VITE_INSFORGE_BASE_URL` | InsForge backend URL |
| `VITE_INSFORGE_ANON_KEY` | InsForge anonymous key |
| `FONEPAY_PG_*` | Fonepay payment gateway credentials |
| `FONEPAY_DYNAMICQR_*` | Fonepay QR credentials |
| `RESEND_API_KEY` | Resend email API key |
| `POS_SYNC_*` | POS integration config |
| `CLIENT_URL` | Production domain for redirects |

**Never commit real credentials.** Edge function secrets are set via the InsForge dashboard.

## Edge Functions

Located in `insforge/functions/`:

| Function | Purpose |
|----------|---------|
| `create-booking` | Create booking with 15-min room hold |
| `fonepay-payment` | Generate QR/web payment, verify callbacks |
| `pos-sync-api` | REST API for external POS system sync |
| `payment-reconciliation` | Cron: detect & recover abandoned payments |
| `admin-recover-payment` | Admin: force-confirm or force-expire bookings |
| `sync-webhook-sender` | Cron: retry failed webhook deliveries |

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # TypeScript check + production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Deployment

Both `netlify.toml` and `vercel.json` are configured for SPA routing (all routes → `/index.html`).

```bash
npm run build
# Deploy the `dist/` folder to Netlify or Vercel
```
