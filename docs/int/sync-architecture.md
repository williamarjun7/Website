# Bidirectional Booking Sync — Production Architecture

---

## 1. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         WEBSITE (6aiag3ra)                       │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Customer │→ │create-booking│→ │sync_events table          │   │
│  │ Booking  │  │(edge fn)     │  │event_type: booking_created│   │
│  │          │  │              │  │status: pending             │   │
│  │ Payment  │  │payment OK ───┼─→│payload: {full booking}     │   │
│  │ (Fonepay)│  │              │  │                            │   │
│  └──────────┘  └──────┬───────┘  └──────────┬───────────────┘   │
│                       │                     │                    │
│              ┌────────▼───────┐   ┌─────────▼────────────┐      │
│              │booking-webhook │   │sync-webhook-sender   │      │
│              │(receives from  │   │(scheduled every 15s) │      │
│              │ POS)          │   │reads pending events   │      │
│              │HMAC validated  │   │HMAC signs + sends    │      │
│              │idempotent      │   │retry on 5xx          │      │
│              └────────┬───────┘   └─────────┬────────────┘      │
│                       │                     │                    │
└───────────────────────┼─────────────────────┼────────────────────┘
                        │                     │
                  HMAC  │               HMAC  │
                  SHA256│               SHA256│
                        │                     │
┌───────────────────────┼─────────────────────┼────────────────────┐
│                       │                     │                    │
│              ┌────────▼───────┐   ┌─────────▼────────────┐      │
│              │booking-webhook │   │website-sync          │      │
│              │(receives from  │   │(sends to Website)    │      │
│              │ Website)       │   │pushes:               │      │
│              │HMAC validated  │   │- new booking         │      │
│              │idempotent      │   │- status update       │      │
│              │avail. check    │   │- availability check  │      │
│              └────────┬───────┘   └─────────┬────────────┘      │
│                       │                     │                    │
│              ┌────────▼─────────────────────▼───────────┐       │
│              │           POS DATABASE                    │       │
│              │  bookings, rooms, room_mappings           │       │
│              │  external_bookings, sync_logs             │       │
│              │  sync_queue, idempotency_keys             │       │
│              └──────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              POS CLIENT OFFLINE LAYER                     │   │
│  │  mutation-queue (IndexedDB) → circuit-breaker → retry    │   │
│  │  dead-letter after 300s, leader-based drain              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         POS (8cvkfu8m)                          │
└──────────────────────────────────────────────────────────────────┘
```

### Control Flow Summary

```
FLOW A (Website → POS):
  Customer books & pays on Website
    → create-booking (edge fn)
    → payment confirmed
    → INSERT sync_event (booking_created, status=pending)
    → sync-webhook-sender (every 15s) reads pending events
    → POSTs HMAC-signed to POS booking-webhook
    → POS validates HMAC + idempotency + availability
    → POS creates booking, links via external_bookings
    → POS returns pos_booking_id
    → sync-webhook-sender updates Website booking with pos_booking_id
    → sync_event marked processed

FLOW B (POS → Website):
  POS staff creates booking (walk-in/phone)
    → BookingForm.tsx → RPC create_booking()
    → onSuccess → pushBookingToWebsite() via booking-sync.ts
    → POSTs HMAC-signed to website-sync (edge fn)
    → website-sync maps room, POSTs to Website booking-webhook
    → Website validates availability, creates booking
    → Returns website_booking_id
    → POS stores external_booking_id in external_bookings
    → sync_log entry created
```

---

## 2. Unified State Machine

### Booking State Machine

```
                    ┌─────────────────────────────────────────────┐
                    │            UNIFIED BOOKING STATES           │
                    └─────────────────────────────────────────────┘

     Website: pending_payment
     POS:     pending
         │
         │ payment confirmed (Website)
         │ OR walk-in created (POS)
         ▼
     ┌──────────┐
     │ confirmed│ ◄────────────────────┐
     └────┬─────┘                      │
          │                            │
     ┌────▼─────┐               ┌──────┴──────┐
     │checked_in│               │  cancelled  │
     └────┬─────┘               └──────┬──────┘
          │                            │
     ┌────▼─────┐                      │
     │checked_out│                     │
     └──────────┘                      │
                                       │
     POS only:                    POS only:
     ┌──────────┐                 ┌──────────┐
     │ no_show  │                 │pending   │ (initial, before confirm)
     └──────────┘                 └──────────┘
```

### Allowed Transitions & Validators

| From | To | Validator | Source |
|---|---|---|---|
| pending_payment | confirmed | payment confirmed | Website only |
| pending | confirmed | availability OK | POS only |
| confirmed | checked_in | room available | Both |
| confirmed | cancelled | no check-in done | Both |
| checked_in | checked_out | invoice settled | Both |
| checked_in | cancelled | manager override | Both |
| any | no_show | past check-in date + no-show | POS only |
| pending | cancelled | no payment made | Both |
| confirmed | pending_payment | N/A (backward) | NOT ALLOWED |

### Room State Machine (POS authoritative)

```
available → reserved → booked → occupied → cleaning → available
                                    └──────► maintenance
```

Website maps: `available`=available, `reserved/booked`=available (shown as bookable but held), `occupied/partial_paid/fully_paid`=occupied, `cleaning`=maintenance, `maintenance`=maintenance.

---

## 3. Data Model & Database Changes

### Website — New: `idempotency_keys`

```sql
CREATE TABLE idempotency_keys (
  key_hash TEXT PRIMARY KEY,           -- SHA-256(operation + key)
  operation TEXT NOT NULL,              -- human-readable operation name
  result JSONB,                        -- cached response payload
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_idempotency_created ON idempotency_keys(created_at);
```

### Website — Modified: `sync_events`

```sql
-- Add columns for POS response tracking
ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS response_body JSONB;
ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS pos_booking_id TEXT;
ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
```

### Website — Modified: `bookings`

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS max_guests INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sync_status TEXT
  DEFAULT 'pending' CHECK (sync_status IN ('pending','synced','failed','not_applicable'));
```

### POS — Modified: `bookings`

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS website_booking_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT
  DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','partially_paid','refunded'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT
  DEFAULT 'pos' CHECK (source IN ('pos','website','phone'));
```

### POS — New: `booking_sync_log` (lightweight tracking)

```sql
CREATE TABLE booking_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','delivered','failed','rejected')),
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);
CREATE INDEX idx_booking_sync_log_status ON booking_sync_log(status, created_at);
CREATE INDEX idx_booking_sync_log_booking ON booking_sync_log(booking_id);
```

---

## 4. Flow A: Website → POS — Detailed Sequence

```
┌─────────┐    ┌──────────────┐    ┌────────────────┐    ┌─────────────┐    ┌──────────┐
│Customer  │    │create-booking│    │sync-webhook-   │    │POS booking- │    │ POS DB   │
│(Browser) │    │(edge fn)     │    │sender (sched.) │    │webhook (fn) │    │          │
└────┬─────┘    └──────┬───────┘    └───────┬────────┘    └──────┬──────┘    └────┬─────┘
     │                 │                    │                    │                 │
     │ 1. POST /book   │                    │                    │                 │
     │────────────────►│                    │                    │                 │
     │                 │ 2. Insert booking  │                    │                 │
     │                 │ (pending_payment)  │                    │                 │
     │                 │───────────────────┼──────────────────────┼───────────────►│
     │                 │                    │                    │                 │
     │                 │ 3. Generate QR     │                    │                 │
     │                 │─── Fonepay API ────│                    │                 │
     │                 │                    │                    │                 │
     │ 4. QR + ID ◄────┤                    │                    │                 │
     │◄────────────────┤                    │                    │                 │
     │                 │                    │                    │                 │
     │ 5. Poll payment │                    │                    │                 │
     │◄──── status ───►│                    │                    │                 │
     │                 │                    │                    │                 │
     │ 6. Fonepay      │                    │                    │                 │
     │    webhook ─────►│ (or direct)       │                    │                 │
     │                 │                    │                    │                 │
     │                 │ 7. confirm_booking │                    │                 │
     │                 │    _payment() RPC  │                    │                 │
     │                 │───────────────────┼──────────────────────┼───────────────►│
     │                 │                    │                    │                 │
     │                 │ 8. INSERT INTO     │                    │                 │
     │                 │    sync_events     │                    │                 │
     │                 │    (booking_created│                    │                 │
     │                 │     ,status=pending│                    │                 │
     │                 │     ,payload={...} │                    │                 │
     │                 │───────────────────┼──────────────────────┼───────────────►│
     │                 │                    │                    │                 │
     │                 │                    │ 9. Scheduled tick  │                 │
     │                 │                    │    (every 15s)     │                 │
     │                 │                    │─── reads pending ──►                 │
     │                 │                    │    sync_events     │                 │
     │                 │                    │    WHERE status    │                 │
     │                 │                    │    = 'pending'     │                 │
     │                 │                    │                    │                 │
     │                 │                    │ 10. POST HMAC-sig │                 │
     │                 │                    │    event payload   │                 │
     │                 │                    │───────────────────►│                 │
     │                 │                    │                    │                 │
     │                 │                    │                    │ 11. validate:   │
     │                 │                    │                    │   - HMAC        │
     │                 │                    │                    │   - idempotency │
     │                 │                    │                    │   - timestamp   │
     │                 │                    │                    │   - availabil.  │
     │                 │                    │                    │                 │
     │                 │                    │                    │ 12. INSERT      │
     │                 │                    │                    │   booking (pos) │
     │                 │                    │                    │   external_bkng │
     │                 │                    │                    │   sync_log      │
     │                 │                    │                    │────────────────►│
     │                 │                    │                    │                 │
     │                 │                    │ 13. 200 OK        │                 │
     │                 │                    │    {               │                 │
     │                 │                    │     pos_booking_id│                 │
     │                 │                    │     status:confirm│                 │
     │                 │                    │    }               │                 │
     │                 │                    │◄───────────────────│                 │
     │                 │                    │                    │                 │
     │                 │                    │ 14. UPDATE         │                 │
     │                 │                    │   bookings SET     │                 │
     │                 │                    │   pos_booking_id,  │                 │
     │                 │                    │   sync_status      │                 │
     │                 │                    │   = 'synced'       │                 │
     │                 │                    │   sync_events      │                 │
     │                 │                    │   status='procd'   │                 │
     │                 │                    │────────────────────┼───────────────►│
     │                 │                    │                    │                 │
```

### Flow A: Idempotency Key Generation

```
key_hash = SHA-256("booking_created:" + website_booking_id + ":" + payment_id)

Used by:
  1. Website create-booking (before INSERT sync_event)
  2. POS booking-webhook (before INSERT booking)
```

### Flow A: API Contract — Website `sync_events` Payload

```json
{
  "event_type": "booking_created",
  "event_id": "uuid-v4",
  "idempotency_key": "sha256(booking_created:<website_booking_id>:<payment_id>)",
  "timestamp": "2026-06-19T10:30:00Z",
  "booking": {
    "website_booking_id": "uuid",
    "room_id": "uuid",
    "check_in": "2026-07-15",
    "check_out": "2026-07-17",
    "guest_name": "John Doe",
    "guest_phone": "+977-98xxxxxxxx",
    "guest_email": "john@example.com",
    "adults": 2,
    "children": 0,
    "nightly_rate": 4500,
    "total_price": 9000,
    "advance_amount": 9000,
    "balance_amount": 0,
    "booking_status": "confirmed",
    "payment_status": "paid",
    "payment_method": "fonepay",
    "fonepay_prn": "HCMIPRN20260619103000123",
    "source": "website"
  }
}
```

### Flow A: API Contract — POS `booking-webhook` (receives from Website)

**Endpoint:** `POST /api/booking-webhook`

**Headers:**
- `x-webhook-signature: HMAC-SHA256(secret_key, body + "." + timestamp)`
- `x-timestamp: 1718782200000` (Unix ms, ±5 min tolerance)
- `x-event-id: uuid-v4`

**Request:**
```json
{
  "event_type": "booking_created",
  "idempotency_key": "sha256(booking_created:<website_booking_id>:<payment_id>)",
  "booking": {
    "website_booking_id": "uuid",
    "room_id": "website-room-uuid",
    "check_in": "2026-07-15",
    "check_out": "2026-07-17",
    "guest_name": "John Doe",
    "guest_phone": "+977-98xxxxxxxx",
    "guest_email": "john@example.com",
    "adults": 2,
    "children": 0,
    "nightly_rate": 4500,
    "total_amount": 9000,
    "paid_amount": 9000,
    "payment_status": "paid",
    "status": "confirmed",
    "source": "website"
  }
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "pos_booking_id": "uuid",
  "pos_booking_number": "BKG-00042",
  "status": "confirmed",
  "room_status": "occupied",
  "mapped_room_id": "pos-room-uuid"
}
```

**Response (Idempotent Repeat 200):**
```json
{
  "success": true,
  "pos_booking_id": "uuid",
  "status": "already_processed",
  "existing_result": { "pos_booking_id": "uuid", "status": "confirmed" }
}
```

**Response (Conflict 409):**
```json
{
  "success": false,
  "status": "rejected",
  "reason": "room_not_available",
  "conflicting_dates": { "check_in": "2026-07-14", "check_out": "2026-07-16" }
}
```

### Flow A: POS `booking-webhook` Handler Pseudocode

```
function handleBookingCreated(request):
    # 1. Validate HMAC
    if !validateHmac(request.body, request.headers['x-webhook-signature'], request.headers['x-timestamp']):
        return 401 { error: "invalid_signature" }
    
    # 2. Timestamp tolerance
    if abs(now() - request.headers['x-timestamp']) > 300_000:  # 5 min
        return 401 { error: "timestamp_out_of_tolerance" }
    
    # 3. Idempotency check
    key_hash = sha256("booking_created:" + request.booking.website_booking_id)
    existing = query("SELECT result FROM idempotency_keys WHERE key_hash = $1", key_hash)
    if existing:
        return 200 { success: true, status: "already_processed", existing_result: existing }
    
    # 4. Map room: website_room_id → pos_room_id
    mapping = query("SELECT pos_room_id FROM room_mappings WHERE website_room_id = $1", 
                    request.booking.room_id)
    if !mapping:
        return 422 { success: false, reason: "room_not_mapped" }
    
    # 5. Validate availability
    conflict = query("""
        SELECT 1 FROM bookings 
        WHERE room_id = $1 
        AND status NOT IN ('cancelled', 'checked_out')
        AND daterange(check_in::date, check_out::date, '[]') && 
            daterange($2::date, $3::date, '[]')
        """, mapping.pos_room_id, request.booking.check_in, request.booking.check_out)
    if conflict:
        return 409 { success: false, reason: "room_not_available" }
    
    # 6. Reserve idempotency key (crash-safe)
    INSERT INTO idempotency_keys (key_hash, operation) 
    VALUES (key_hash, 'booking_created')
    ON CONFLICT DO NOTHING
    if not inserted:  # race lost
        return 200 { success: true, status: "already_processed" }
    
    # 7. Create booking in POS
    pos_booking = query("SELECT create_booking($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        mapping.pos_room_id,
        request.booking.guest_name,
        request.booking.guest_email,   # NEW column
        request.booking.guest_phone,
        request.booking.check_in,
        request.booking.check_out,
        request.booking.adults,
        request.booking.children,
        request.booking.nightly_rate
    )
    
    # 8. Set pre-paid if Website payment completed
    if request.booking.payment_status == 'paid':
        query("UPDATE bookings SET paid_amount = $1, total_amount = $2, 
               payment_status = 'paid' WHERE id = $3",
            request.booking.paid_amount, request.booking.total_amount, pos_booking.id)
    
    # 9. Link external booking
    query("INSERT INTO external_bookings (pos_booking_id, source, external_booking_id) 
           VALUES ($1, 'website', $2)", pos_booking.id, request.booking.website_booking_id)
    
    # 10. Log sync entry
    query("INSERT INTO sync_logs (direction, event_type, entity_type, entity_id, 
           external_id, status, request_body, response_body, idempotency_key) 
           VALUES ('inbound', 'booking_created', 'booking', $1, $2, 'delivered', $3, $4, $5)",
        pos_booking.id, request.booking.website_booking_id, request.body, response_body, key_hash)
    
    # 11. Mark idempotency completed
    UPDATE idempotency_keys SET result = $1, completed_at = NOW() WHERE key_hash = $2
    
    return 200 { success: true, pos_booking_id: pos_booking.id, status: "confirmed" }
```

---

## 5. Flow B: POS → Website — Detailed Sequence

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐    ┌────────┐
│POS Staff │    │BookingForm   │    │website-sync  │    │Website     │    │Website │
│(Browser) │    │+ booking-    │    │(POS edge fn) │    │booking-    │    │ DB     │
│          │    │sync.ts       │    │              │    │webhook     │    │        │
└────┬─────┘    └──────┬───────┘    └──────┬───────┘    └─────┬──────┘    └───┬────┘
     │                 │                    │                  │               │
     │ 1. Fill form    │                    │                  │               │
     │────────────────►│                    │                  │               │
     │                 │                    │                  │               │
     │                 │ 2. RPC             │                  │               │
     │                 │   create_booking() │                  │               │
     │                 │────────────────────┼──────────────────┼──────────────►│
     │                 │                    │                  │               │
     │                 │ 3. onSuccess:      │                  │               │
     │                 │   pushBookingTo    │                  │               │
     │                 │   Website()        │                  │               │
     │                 │───────────────────►│                  │               │
     │                 │                    │                  │               │
     │                 │                    │ 4. HMAC sign     │               │
     │                 │                    │    POST          │               │
     │                 │                    │─────────────────►│               │
     │                 │                    │                  │               │
     │                 │                    │                  │ 5. Validate:  │
     │                 │                    │                  │   - HMAC      │
     │                 │                    │                  │   - idempot.  │
     │                 │                    │                  │   - avail.    │
     │                 │                    │                  │               │
     │                 │                    │                  │ 6. Website    │
     │                 │                    │                  │    INSERT     │
     │                 │                    │                  │   booking     │
     │                 │                    │                  │   source=pos  │
     │                 │                    │                  │──────────────►│
     │                 │                    │                  │               │
     │                 │                    │ 7. 200 OK       │               │
     │                 │                    │   {website_bkg} │               │
     │                 │                    │◄─────────────────│               │
     │                 │                    │                  │               │
     │                 │ 8. store external  │                  │               │
     │                 │    _booking_id     │                  │               │
     │                 │◄───────────────────│                  │               │
     │                 │                    │                  │               │
     │ 9. success UI   │                    │                  │               │
     │◄────────────────│                    │                  │               │
```

### Flow B: API Contract — POS `website-sync` (sends to Website)

**Endpoint:** `POST /api/website-sync`

**Headers:** Same HMAC scheme as Flow A, with `POS_WEBHOOK_SECRET` as Website secret.

**Action Types:**

`push_booking` — New booking created in POS:
```json
{
  "action": "push_booking",
  "idempotency_key": "sha256(push_booking:<pos_booking_id>)",
  "booking": {
    "pos_booking_id": "uuid",
    "room_id": "pos-room-uuid",
    "guest_name": "Walk-in Guest",
    "guest_phone": "+977-98xxxxxxxx",
    "check_in": "2026-07-15T14:00:00+05:45",
    "check_out": "2026-07-17T12:00:00+05:45",
    "adults": 2,
    "children": 0,
    "nightly_rate": 4500,
    "total_amount": 9000,
    "paid_amount": 0,
    "status": "confirmed",
    "notes": "Walk-in booking by reception"
  },
  "room_mapping": {
    "pos_room_id": "uuid",
    "website_room_id": "uuid"
  }
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "website_booking_id": "uuid",
  "status": "accepted",
  "mapped_room_id": "uuid"
}
```

**Response (Conflict 409):**
```json
{
  "success": false,
  "status": "rejected",
  "reason": "room_not_available",
  "website_room_id": "uuid"
}
```

### Flow B: Website `booking-webhook` Handler Pseudocode

```
function handlePushBooking(request):
    # 1. HMAC + timestamp validation (same as Flow A)
    
    # 2. Idempotency
    key_hash = sha256("push_booking:" + request.booking.pos_booking_id)
    
    # 3. Verify room mapping/availability
    website_room = query("SELECT id, availability_status FROM rooms WHERE id = $1", 
                         request.room_mapping.website_room_id)
    if !website_room:
        return 422 { success: false, reason: "room_not_found" }
    
    # 4. Conflict check
    conflict = query("""
        SELECT 1 FROM bookings 
        WHERE room_id = $1 
        AND booking_status NOT IN ('cancelled', 'checked_out')
        AND daterange(check_in, check_out, '[]') && 
            daterange($2::date, $3::date, '[]')
        """, request.room_mapping.website_room_id, 
        request.booking.check_in, request.booking.check_out)
    if conflict:
        return 409 { success: false, reason: "room_not_available" }
    
    # 5. Insert Website booking with source='pos', pos_booking_id
    booking_id = query("""
        INSERT INTO bookings 
        (room_id, guest_name, guest_phone, check_in, check_out, 
         adults, children, nightly_rate, total_price, 
         booking_status, payment_status, source, pos_booking_id)
        VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, 
                'confirmed', 'unpaid', 'pos', $10)
        RETURNING id
        """, 
        request.room_mapping.website_room_id,
        request.booking.guest_name,
        request.booking.guest_phone,
        request.booking.check_in, request.booking.check_out,
        request.booking.adults, request.booking.children,
        request.booking.nightly_rate, request.booking.total_amount,
        request.booking.pos_booking_id
    )
    
    return 200 { success: true, website_booking_id: booking_id, status: "accepted" }
```

---

## 6. HMAC Security Specification

### Signing Algorithm

```
payload_string = json_stringify(body)
signature_input = payload_string + "." + timestamp_ms
signature = HMAC-SHA256(secret_key, signature_input)
signature_base64 = base64_encode(signature)
```

### Verification

```
1. Extract x-timestamp from header
2. If |now_ms - timestamp_ms| > 300_000 → REJECT (stale)
3. Recompute signature using same algorithm
4. Constant-time compare with x-webhook-signature
5. If mismatch → REJECT 401
```

### Secret Management

| Secret | Used By | Purpose |
|---|---|---|
| `WEBSITE_SYNC_SECRET` | POS website-sync | Signs outgoing POS→Website requests |
| `POS_WEBHOOK_SECRET` | Website booking-webhook | Verifies incoming POS→Website requests |
| `POS_SYNC_SECRET` | Website sync-webhook-sender | Signs outgoing Website→POS requests |
| `WEBSITE_SYNC_SECRET` | POS booking-webhook | Verifies incoming Website→POS requests |

Secrets stored as InsForge edge function secrets (not in code). Rotated every 90 days.

---

## 7. Idempotency Framework

### Unified Idempotency Protocol (Both Systems)

```
Key Format:  SHA-256("<operation>:<entity_id>[:<salt>]")
Operations:
  - "booking_created:<website_booking_id>:<payment_id>"  (Flow A)
  - "push_booking:<pos_booking_id>"                      (Flow B)
  - "push_status_update:<pos_booking_id>:<new_status>"    (status sync)
  - "payment_confirmed:<payment_id>"                      (payment sync)
```

### Crash-Safe Two-Phase Commit

```
PHASE 1 — Reserve:
  INSERT INTO idempotency_keys (key_hash, operation)
  VALUES ($1, $2)
  ON CONFLICT (key_hash) DO NOTHING
  RETURNING key_hash  → if row returned: we won the race

PHASE 2 — Execute:
  [process the request, write to DB]

PHASE 3 — Complete:
  UPDATE idempotency_keys 
  SET result = $1, completed_at = NOW() 
  WHERE key_hash = $2

CRASH RECOVERY:
  On next request with same key_hash:
  → SELECT result, completed_at
  → if completed_at IS NULL: last attempt crashed → re-execute (safe because PHASE 1 reserve prevents concurrent)
  → if completed_at IS NOT NULL: return cached result
```

---

## 8. Retry & Dead-Letter System

### Website Side (sync_events based)

```
State Machine for sync_events:
  pending → processing → processed (success)
                       → failed (4xx, non-retryable)
                       → retrying → pending (5xx/network, with backoff)

Retry Schedule:
  Attempt 1: immediate
  Attempt 2: +5 seconds
  Attempt 3: +15 seconds
  Attempt 4: +30 seconds
  Attempt 5: +60 seconds
  → After 5: status = 'dead_letter'

sync-webhook-sender logic (every 15s):
  SELECT * FROM sync_events 
  WHERE status = 'pending' 
     OR (status = 'retrying' AND next_retry_at <= NOW())
  ORDER BY created_at ASC
  LIMIT 50
  FOR UPDATE SKIP LOCKED
```

### POS Side (client-side mutation queue)

```
mutation-queue.ts:
  Enqueue → Attempt HTTP → Success: dequeue
                          → Fail: retry_count++
                                  backoff: 1s → 2s → 4s → 8s → 30s
                                  max 5 attempts
                                  stuck >300s: dead_letter

circuit-breaker.ts:
  10 failures in 30s window → OPEN (block all sync for 30s)
  30s timeout → HALF-OPEN → probe 1 request
  success → CLOSE | fail → OPEN again
```

### Dead-Letter Management

```
Both systems maintain dead-letter visibility:
  1. Website: sync_events WHERE status = 'dead_letter'
  2. POS: sync_queue WHERE status = 'dead_letter'
  
Recovery:
  - Manual retry via SyncAdminPanel
  - Periodic sweep: try dead-letter items every 6 hours
  - Alert if dead-letter count > 10 in an hour
```

---

## 9. Failure Handling Matrix

| Scenario | Detection | Recovery | Data Integrity |
|---|---|---|---|
| **Duplicate webhook delivery** | Idempotency key match | Return cached result | Preserved — no double booking |
| **Partial sync: Website has booking, POS never notified** | sync_event status=retrying past 5 min | sync-webhook-sender retries | Website booking exists, POS missing → reconciled |
| **POS rejects due to conflict** | 409 response to sync-webhook-sender | Website sync_event → failed → dead_letter | Website booking cancelled and refunded (manual) |
| **Payment confirmed but sync to POS failed** | sync_event dead_letter after max retries | Alert admin, manual retry | Money taken, POS has no booking → refund risk |
| **Network retry duplication** | Idempotency on receiver | Second request returns existing result | Safe — idempotent |
| **Out-of-order events** | Timestamp comparison on receiver | Reject events with timestamp older than current state | POS state is authoritative — Website accepts latest |
| **POS edge function cold start** | Request timeout (5s) | Client mutation queue retries | Eventually consistent |
| **HMAC secret mismatch** | Validation fails | Return 401, log security event | No data change — discarded |
| **POS booking but Website sync fails** | POS mutation queue retries → dead-letter | Admin alert, SyncAdminPanel | POS booking exists, Website missing → reconciled |
| **Simultaneous conflicting bookings (Website + POS same room)** | POS availability check on both flows | POS wins always → Website booking cancelled | POS authoritative |
| **Database transaction failure mid-sync** | Idempotency commit not reached | Next retry finds incomplete idempotency → re-execute | Crash-safe |
| **Clock skew >5 min** | HMAC timestamp check | 401, event discarded | Events must be replayed after clock sync |

---

## 10. Reconciliation Cron Design

### Scheduled Job (Runs every 6 hours on POS)

```
function reconcileBookings():
    # 1. Get all POS bookings synced to Website in last 24h
    pos_bookings = query("""
        SELECT b.*, eb.external_booking_id 
        FROM bookings b
        JOIN external_bookings eb ON eb.pos_booking_id = b.id
        WHERE eb.source = 'website'
        AND b.updated_at > NOW() - INTERVAL '24 hours'
    """)
    
    # 2. For each, verify Website has matching booking
    for each pos_booking:
        website_booking = call Website API: GET /api/booking-webhook/check?website_id=X
        if not website_booking:
            alert("MISMATCH: POS booking #{pos_booking.id} not on Website")
            queue_retry(pos_booking.id)
    
    # 3. Check for Website bookings not linked in POS
    website_events = query("""
        SELECT * FROM sync_logs 
        WHERE direction = 'inbound' 
        AND event_type = 'booking_created'
        AND status = 'delivered'
        AND created_at > NOW() - INTERVAL '24 hours'
    """)
    # Verify each has external_bookings entry
    for each event:
        if not query("SELECT 1 FROM external_bookings WHERE external_booking_id = $1", event.external_id):
            alert("ORPHAN: Website booking #{event.external_id} not linked in POS")
    
    # 4. Generate reconciliation report
    return { checked: N, ok: M, mismatches: [...], orphans: [...] }
```

### Drift Detection (Runs every 30 min from Website)

```
function detectDrift():
    # Compare booking counts by date
    website_counts = query("""
        SELECT room_id, check_in::date, COUNT(*) as count
        FROM bookings 
        WHERE check_in >= CURRENT_DATE 
        AND booking_status NOT IN ('cancelled', 'checked_out')
        GROUP BY room_id, check_in::date
    """)
    
    pos_counts = call POS API: GET /api/booking-webhook/availability?date=today
    
    for each room/date:
        if website_counts[room][date] != pos_counts[room][date]:
            alert("DRIFT: Room #{room} on #{date}: Website=#{wc} POS=#{pc}")
            trigger_reconciliation(room, date)
```

---

## 11. Eventual Consistency Guarantees

| Metric | Target | Mechanism |
|---|---|---|
| Max sync delay (Flow A) | 30 seconds | sync-webhook-sender runs every 15s, retries with backoff |
| Max sync delay (Flow B) | 5 seconds | Client-side immediate push with retry queue |
| RPO (Recovery Point Objective) | < 1 minute | Idempotency + sync_events persistent queue |
| RTO (Recovery Time Objective) | < 5 minutes | Automatic retry, dead-letter recovery |
| Duplicate probability | < 0.001% | Idempotency framework + crash-safe two-phase |
| Data loss probability | < 0.0001% | Both sides store booking before sync attempt |
| Conflict detection latency | Real-time | POS availability check on every booking creation |

---

## 12. Implementation Order

### Phase 1 — Foundation (no behavior change)

```
Files to create/modify:
  Website:
    - migrations/add_idempotency.sql       (idempotency_keys table)
    - src/lib/services/idempotency.ts      (idempotency helpers)
  POS:
    - migrations/add_guest_email.sql       (guest_email + other columns)
    - migrations/add_booking_sync_log.sql  (new tracking table)
```

### Phase 2 — Flow A: Website → POS

```
Files to create/modify:
  Website:
    - functions/create-booking/index.js    (+ sync_event emission on payment)
    - functions/sync-webhook-sender/index.ts (rewrite to POST to POS)
    - functions/booking-webhook/index.js   (+ idempotency check)
  POS:
    - functions/booking-webhook/index.js   (+ booking_created handler)
```

### Phase 3 — Flow B: POS → Website (already working, add idempotency)

```
Files to modify:
  POS:
    - src/lib/services/booking-sync.ts     (+ idempotency keys in request)
    - functions/website-sync/index.js       (+ versioning for new payloads)
  Website:
    - functions/booking-webhook/index.js   (+ push_booking idempotency)
```

### Phase 4 — Monitoring & Reconciliation

```
Files to create:
  POS:
    - functions/reconcile-bookings/index.ts (scheduled, every 6h)
  Website:
    - functions/drift-detection/index.ts   (scheduled, every 30min)
    - components/SyncHealthDashboard.tsx    (admin UI)
```

---

## 13. Recommended Improvements

1. **Event Sourcing**: Replace the current sync_events/sync_queue with a proper event store. Each state change emits an immutable event. Projections build current state. Enables replay, audit, and debugging.

2. **CQRS Separation**: Separate read models from write models. POS writes are authoritative. Website reads from a materialized view that's eventually consistent. Eliminates direct DB reads across systems.

3. **Webhook Retry Idempotency Gateway**: Build a lightweight gateway layer that sits in front of both webhook receivers. Handles HMAC, idempotency, rate limiting, and retry routing — keeps business logic clean.

4. **Distributed Tracing**: Add `x-request-id` and `x-span-id` headers to all sync requests. Each booking lifecycle gets a trace ID. Enables debugging multi-hop failures.

5. **Chaos Testing**: Introduce network failures, delayed responses, duplicate requests, and out-of-order delivery in staging. Validate the system handles every failure matrix entry.

6. **Guest Identity Resolution**: Add a `guests` table to both systems with merge rules. Match by email + phone. Enables loyalty tracking, booking history across channels.

7. **Sync SLA Dashboard**: Real-time dashboard showing: pending sync count, average sync latency, dead-letter count, drift events, reconciliation status. Alert on SLA breaches.

8. **Bulk Reconciliation API**: Endpoint that accepts a date range and returns all bookings in that range from each system side-by-side with mismatch flags. One-click repair for flagged items.
