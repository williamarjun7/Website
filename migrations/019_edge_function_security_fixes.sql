-- Migration 019: Record of edge function security fixes (applied to Deno/TypeScript, not SQL)
-- Companion to 018_fix_rls_admin_only.sql — documents the code-level fixes for audit trail.
-- Applied to: insforge/functions/fonepay-payment/index.ts, create-booking/index.ts
-- Date: 2026-06-14

-- ── Summary of code fixes (not SQL) ────────────────────────────────────
--
-- fonepay-payment/index.ts:
--   C2: verifyAdminJwt() — replaced user_metadata.role check with admins table lookup
--       (queries public.admins via service_role API key)
--   C3: generate-qr and generate-web — added booking.guest_email === auth.user.email
--       ownership verification (403 if mismatch)
--   H2: buildConfirmationHtml() — all dynamic values passed through htmlEncode()
--   H3: Fonepay API error messages sanitized — generic messages returned to client
--   verifySession() now returns user { id, email } for ownership checks
--
-- create-booking/index.ts:
--   H1: Removed advance_amount/balance_amount from Zod schema
--       Server always computes: advAmount = (pay_at_property ? 60% : total_price)
--
-- authService.ts + AdminGate.tsx + AdminSignup.tsx:
--   H4: adminSignup() returns error; signup route removed from public routes
--
-- ── Deploy instructions ────────────────────────────────────────────────
-- 1. insforge functions deploy fonepay-payment
-- 2. insforge functions deploy create-booking
-- 3. Also disable public signups in InsForge auth dashboard

SELECT 'Migration 019 recorded' AS status;
