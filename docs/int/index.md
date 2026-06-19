# HighLands Cafe Integration Analysis

Complete 15-phase analysis for bidirectional sync between Website (`6aiag3ra`) and POS (`8cvkfu8m`).

## Reports

| Phase | Document | Status |
|---|---|---|
| 1 | [System Discovery](01-system-discovery.md) | ✅ Complete |
| 2 | [Database Reverse Engineering](02-database-reverse-engineering.md) | ✅ Complete |
| 3 | [Business Workflow Analysis](03-business-workflow-analysis.md) | ✅ Complete |
| 4 | [Entity Mapping](04-entity-mapping.md) | ✅ Complete |
| 5 | [Gap Analysis](05-gap-analysis.md) | ✅ Complete |
| 6 | [Architecture Decision](06-architecture-decision.md) | ✅ Complete |
| 7-15 | [Implementation Blueprint](07-implementation-blueprint.md) | ✅ Complete |

## Key Findings

**Critical Gap:** Website customer bookings never reach POS (double-booking risk, missed arrivals).

**Recommended Architecture:** Option E — Hybrid with POS as source of truth for hotel operations, Website for customer-facing data. Bidirectional sync via HMAC-signed REST webhooks.

**Priority Fix:** Wire `create-booking` → `sync_events` → `sync-webhook-sender` → POS `booking-webhook` (estimated 4-6 hours).

## Database Credentials

| System | Connection |
|---|---|
| Website | `postgresql://postgres:7c83753ffea4d6cad29237cc41b0c951@6aiag3ra.us-east.database.insforge.app:5432/insforge?sslmode=require` |
| POS | `postgresql://postgres:04561a21ce9b4fefe9544574074d6654@8cvkfu8m.us-east.database.insforge.app:5432/insforge?sslmode=require` |
