# Phase 6: Architecture Decision Document

## Context

Two separate InsForge projects (Website: `6aiag3ra`, POS: `8cvkfu8m`), each with their own Postgres database in the same region (`us-east`). The Website serves customers (browsing, booking, payment). The POS serves staff (hotel operations, restaurant, inventory). Both need to share room availability and booking data.

## Constraints

1. **No breaking changes** — existing flows must continue working during and after integration
2. **Separate DBs** — no shared database (different InsForge projects)
3. **Minimal migration** — no restructured schemas or moved data unless required
4. **Incremental rollout** — deploy sync per entity type, not all at once
5. **Existing infrastructure** — reuse `room_mappings`, `sync_logs`, `sync_queue`, `external_bookings`, `sync_events`, edge functions where possible

---

## Option A: Shared Database

**Idea:** Migrate both projects to a single Postgres instance. Both apps read/write the same tables.

**Pros:**
- Instant consistency — no sync needed
- Single source of truth
- Real-time by default
- SIMPLEST architecture

**Cons:**
- **BREAKING CHANGE** — violates constraint #1
- Different RLS policies incompatible (anon vs authenticated)
- Massive data migration risk
- Both apps would need connection string updates
- InsForge projects can't share DBs natively — would need to manually configure
- If one project deploys a migration that breaks the other, both are down

**Verdict: ❌ Rejected.** Violates "no breaking changes" and "backup before migration" plus both would need re-architecture.

---

## Option B: Shared REST API Layer (Microservices)

**Idea:** Extract shared business logic (rooms, bookings, payments) into a standalone API service that both Website and POS call instead of direct DB.

**Pros:**
- Clean separation of concerns
- API contract as single source of truth
- Each system can evolve independently behind the API

**Cons:**
- **MASSIVE BREAKING CHANGE** — both apps' data layers would need complete rewrite
- Months of development
- Both apps currently use direct DB calls (InsForge SDK) — not abstracted behind repositories
- New service needs deployment, scaling, monitoring
- Extra latency on every operation

**Verdict: ❌ Rejected.** Massive scope, violates "no breaking changes", months of work.

---

## Option C: Bidirectional REST API Sync (Extend Existing)

**Idea:** Extend the existing POS → Website sync pattern to be bidirectional. Both systems expose webhook endpoints and call each other on data changes.

**Architecture:**
```
Website DB ← Website Edge Functions → POS Edge Functions → POS DB
              ↕ (HTTP + HMAC)          ↕ (HTTP + HMAC)
         [sync_events table]      [sync_queue table]
```

**Pros:**
- Extends existing, proven pattern (POS → Website works today)
- No changes to existing app code
- Edge functions are already deployed
- HMAC signing + idempotency already designed (partial)
- Event-driven via triggers (Website `sync_events`, POS `system_events`)

**Cons:**
- Two-phase eventual consistency (A→sync event→edge function→B→response→log)
- Conflict resolution needed for concurrent edits
- Network failures → retry queue needed on both sides
- Data can be stale between sync cycles
- Each entity type needs its own sync handler

**Verdict: 🤔 Plausible.** Lowest effort, extends existing infrastructure, no breaking changes. But needs conflict resolution and retry on both sides.

---

## Option D: Event-Driven via Realtime + Queue

**Idea:** Use InsForge Realtime (WebSocket) + edge function queues for event-driven sync. Database triggers publish events via Realtime. Edge functions subscribe and forward to the other system.

**Architecture:**
```
Website DB → Trigger → Realtime Channel → Edge Function (subscriber) → HTTP → POS Edge Function → POS DB
POS DB → Trigger → Realtime Channel → Edge Function (subscriber) → HTTP → Website Edge Function → Website DB
```

**Pros:**
- True event-driven — near real-time
- No polling, no scheduled functions
- Decoupled — each side can evolve independently
- POS already has `system_events` + realtime infrastructure

**Cons:**
- Realtime is ephemeral — missed events if subscriber is down
- Need durable queue backing the realtime subscription
- More complex to debug
- InsForge Realtime has 5-min idle disconnect — need keepalive
- Both sides need persistent subscriber processes (edge functions have cold starts)

**Verdict: ❌ Rejected.** Risk of missed events. Edge functions aren't designed for persistent subscribers. Would need a separate worker service.

---

## Option E (Recommended): Hybrid — POS Source of Truth for Ops, Event-Driven Bridge

**Core Principle:**
- **POS is source of truth** for hotel operations: rooms, room types, pricing, bookings, statuses
- **Website is source of truth** for customer-facing content: site_content, site_images
- **Sync bridge** connects the two:
  - POS → Website: rooms, bookings, status updates (existing, extend)
  - Website → POS: customer bookings + payments (new, add)
  - Content: one-way Website → POS (POS reads Website content for display)

**Architecture:**
```
┌─────────────────────────────┐         ┌─────────────────────────────┐
│         WEBSITE DB          │         │          POS DB            │
│  (6aiag3ra)                 │         │  (8cvkfu8m)                │
│                             │         │                             │
│  rooms (synced from POS)    │◄────────│  rooms (source of truth)    │
│  bookings (customer) ───────┼────────►│  bookings (synced from web) │
│  payments (customer)        │         │  payments (walk-in)         │
│  site_content (source)      │         │  menu_items (source) ──────┼────────► Website menu (future)
│  menu_items (from POS) ◄────┼─────────┤                             │
│  sync_events (outbox)       │         │  room_mappings              │
│                             │         │  sync_logs / sync_queue     │
│  EDGE FUNCTIONS:            │         │  external_bookings          │
│  sync-webhook-sender ───────┼────────►│                             │
│  booking-webhook ◄──────────┼─────────┤  EDGE FUNCTIONS:            │
│  pos-sync-api ◄─────────────┼─────────┤  website-sync (outbound)    │
│                             │         │  booking-webhook (inbound)  │
└─────────────────────────────┘         └─────────────────────────────┘
```

### Data Ownership Matrix

| Entity | Source of Truth | Sync Direction | Mechanism |
|---|---|---|---|
| Rooms | POS | POS → Website | POS trigger + website-sync → booking-webhook |
| Room Types | POS | POS → Website | Via room sync (room_type text derived from type name) |
| Room Images | Website | Website → POS (primary only) | Manual or one-way sync |
| Bookings (customer) | Website | Website → POS | create-booking → sync_events → sync-webhook-sender → POS booking-webhook |
| Bookings (walk-in) | POS | POS → Website | Existing: BookingForm → website-sync → booking-webhook |
| Payments (customer) | Website | Website → POS (as paid_amount) | Part of booking sync |
| Payments (walk-in) | POS | — | POS only (no Website equivalent) |
| Booking Status | Shared | Bidirectional | POS → Website on status change; Website → POS on customer action |
| Pricing Rules | POS | POS → Website | As part of room/rate sync |
| Menu Items | POS | POS → Website (future) | One-way sync |
| Site Content | Website | — | Website only |
| Customer Accounts | Neither | — | Both embed in bookings |

### Sync Flows (Detailed)

#### Flow 1: Customer Books on Website (NEW — currently missing)
```
1. Customer fills booking form on Website
2. create-booking edge function:
   a. Creates booking in Website DB (pending_payment)
   b. (Payment flow: Fonepay QR → confirmation)
3. On payment confirmed:
   c. INSERT into sync_events (event_type='booking_created', source='website')
   d. OR directly call POS booking-webhook
4. sync-webhook-sender (scheduled, every 30s) OR immediate:
   e. Reads unprocessed sync_events
   f. POSTs to POS booking-webhook edge function
   g. POS booking-webhook: creates booking in POS DB
   h. Links via external_bookings
   i. Creates sync_log entry
   j. Marks sync_event as processed
```

#### Flow 2: POS Staff Creates Booking (EXISTING, EXTEND)
```
1. Staff creates booking in POS
2. BookingForm.tsx: on success → pushBookingToWebsite()
3. website-sync edge function → POST to Website booking-webhook
4. Website booking-webhook:
   a. Creates/updates Website booking
   b. Links via external_bookings
   c. If booking was created for a Website-paid customer → set payment fields correctly
5. Website booking trigger → sync_events (to allow Website → POS acknowledgment)
```

#### Flow 3: POS Status Update (EXISTING)
```
1. Staff checks-in/out/cancels in POS
2. motel.hooks.ts → pushStatusUpdateToWebsite()
3. website-sync → booking-webhook → Website booking updated
```

#### Flow 4: Room Data Sync (ENHANCE)
```
1. POS room/room_type/price changes
2. Trigger system_event on rooms or room_types
3. website-sync edge function (scheduled or event-triggered):
   a. Reads changed rooms
   b. POSTs to Website pos-sync-api or booking-webhook
   c. Website updates rooms table
   d. Logs sync entry
```

### Conflict Resolution Strategy

| Conflict | Strategy |
|---|---|
| Same booking updated on both sides | Last-writer-wins using `updated_at` timestamp comparison |
| POS cancels Website-confirmed booking | POS wins (overbooking control) |
| Website customer cancels after POS check-in | Reject: POS check-in locks booking |
| Room status changed on both sides | POS wins (operational reality) |
| Double-booking detection | POS availability check on sync (POS `create_booking` checks conflicts) |

### Error Handling

| Failure | Handling |
|---|---|
| Network error on sync | Retry queue (POS side: existing sync_queue; Website side: retry sync_events) |
| POS edge function down | sync_events stay unprocessed, retry on next schedule |
| Website edge function down | POS mutation queue retries with backoff (max 5, 1s→30s) → dead-letter |
| HMAC signature mismatch | Log error, return 401, no retry (security event) |
| Booking conflict on target | Return conflict error, log sync_log, alert admin |
| Idempotency collision | Return existing result (POS has this; Website needs it) |

### Migration Plan (Zero-Downtime)

**Phase 6a: Foundation (no behavior change)**
1. Add `guest_email` column to POS `bookings` table
2. Add `max_guests` column to Website `rooms` table
3. Implement idempotency on Website edge functions
4. Add idempotency_keys table to Website DB

**Phase 6b: Website → POS Booking Sync (CRITICAL fix)**
1. Add Website `sync_events` handling to POS `booking-webhook` edge function
2. Wire `create-booking` to create `sync_events` or directly call POS
3. Activate `sync-webhook-sender` for POS delivery
4. Handle pre-paid status in POS (set paid_amount = total_amount)

**Phase 6c: Room Data Sync (HIGH)**
1. Add POS room changes → sync to Website
2. Handle room type mapping (text ↔ normalized)
3. Add status enum mapping layer

**Phase 6d: Monitoring & Recovery**
1. Dashboard showing sync health
2. Manual retry UI for dead-letter items
3. Alerting on sync failures > threshold
4. Periodic consistency checks (reconcile booking counts)

---

## Decision Summary

| Criterion | A (Shared DB) | B (API Layer) | C (REST Only) | D (Event) | E (Hybrid) |
|---|---|---|---|---|---|
| No breaking changes | ❌ | ❌ | ✅ | ✅ | ✅ |
| Existing infra reuse | ❌ | ❌ | ✅ | ⚠️ | ✅ |
| Implementation speed | Medium | Very Slow | Fast | Slow | Fast |
| Consistency | Immediate | Immediate | Eventual | Eventual | Eventual |
| Offline resilience | N/A | N/A | ⚠️ | ✅ | ✅ (POS) |
| Complexity | Low | High | Medium | High | Medium |
| Conflict resolution | N/A | N/A | Manual | Auto | Auto |
| Future extensibility | Low | High | Medium | High | High |

**Recommendation: ✅ OPTION E — Hybrid with POS as Source of Truth**

Rationale:
1. Extends existing, working infrastructure (POS → Website sync already functional)
2. No breaking changes to either system
3. Fastest path to fixing the critical gap (G-1: Website → POS booking sync)
4. Clear data ownership boundaries (no ambiguity about who owns what)
5. Incremental rollout possible (entity by entity)
6. POS already has the retry queue, circuit breaker, and idempotency infrastructure
7. Reuses existing edge functions with minimal modifications
