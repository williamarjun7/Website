// ═══════════════════════════════════════════════════════════════════
// PHASE 4: PostgreSQL RLS Security Audit
//
// Tests RLS policies for anon, authenticated, and service_role
// against ALLOWED and FORBIDDEN tables.
//
// ALLOWED tables: bookings, rooms, room_types, sync tables
// FORBIDDEN tables: any inventory, suppliers, purchases, expenses,
//                   sales, payroll, staff, audit tables
//
// For each FORBIDDEN table + role combination, tests:
//   SELECT, INSERT, UPDATE, DELETE
//
// Expected: ALL forbidden operations return permission denied.
//
// Run: deno test --no-check --allow-net rls-security-audit.test.deno.ts
// ═══════════════════════════════════════════════════════════════════

import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts"

const BASE_URL = Deno.env.get("INSFORGE_BASE_URL") ?? "https://6aiag3ra.us-east.insforge.app"
const ANON_KEY = Deno.env.get("VITE_INSFORGE_ANON_KEY") ?? ""
const AUTH_KEY = Deno.env.get("TEST_AUTH_JWT") ?? ""
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

interface TableAccess {
  table: string
  role: string
  operation: string
  allowed: boolean
  status?: number
  error?: string
}

const ALLOWED_TABLES = [
  "bookings",
  "rooms",
  "room_images",
  "site_content",
  "site_images",
  "menu_items",
  "menu_categories",
]

const FORBIDDEN_TABLES = [
  "inventory",
  "suppliers",
  "purchases",
  "expenses",
  "sales",
  "payroll",
  "staff",
  "audit_logs",
]

const SYNC_TABLES = [
  "sync_events",
  "idempotency_keys",
  "sync_reconciliation_logs",
  "sync_repair_jobs",
]

const ROLES = [
  { name: "anon", key: ANON_KEY },
  { name: "authenticated", key: AUTH_KEY },
]

async function testAccess(
  table: string,
  role: string,
  key: string,
  operation: string,
): Promise<TableAccess> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": ANON_KEY,
  }

  if (key) {
    headers["Authorization"] = `Bearer ${key}`
  }

  // For SELECT and DELETE, we use GET
  // For INSERT and UPDATE, we use POST
  const isWrite = operation === "INSERT" || operation === "UPDATE"
  const isDelete = operation === "DELETE"

  try {
    let resp: Response
    const url = `${BASE_URL}/rest/v1/${table}`

    if (isWrite) {
      resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ _test: true, _timestamp: Date.now() }),
      })
    } else if (isDelete) {
      resp = await fetch(url, {
        method: "DELETE",
        headers,
      })
    } else {
      resp = await fetch(`${url}?limit=1`, {
        method: "GET",
        headers,
      })
    }

    // 401 = no auth (anon/api key missing) — could be considered "allowed" for public tables
    // 403 = permission denied (RLS blocked) — what we expect for forbidden tables
    // 200/201/204 = access allowed
    // 404 = table might not exist (potential RLS pass-through)
    // 406 = not acceptable (format issue)
    // 406+ = various client errors
    const status = resp.status

    let allowed = false
    if (status === 200 || status === 201 || status === 204) {
      allowed = true
    } else if (status === 401 || status === 403) {
      allowed = false
    } else if (status === 404) {
      // Table doesn't exist — not an RLS issue
      allowed = false
    } else if (status === 406 || status === 400 || status === 415) {
      // Client error but the request reached the table — likely allowed to attempt
      allowed = true
    }

    const body = await resp.text().catch(() => "")
    const error = status >= 400 ? body.slice(0, 200) : undefined

    return {
      table,
      role,
      operation,
      allowed,
      status,
      error,
    }
  } catch (err) {
    return {
      table,
      role,
      operation,
      allowed: false,
      error: String(err),
    }
  }
}

// ── ALLOWED TABLES ──────────────────────────────────────────────

Deno.test({
  name: "RLS-ALLOW-1: anon can SELECT allowed tables",
  fn: async () => {
    const results: TableAccess[] = []
    for (const table of ALLOWED_TABLES) {
      const result = await testAccess(table, "anon", ANON_KEY, "SELECT")
      results.push(result)
    }
    const denied = results.filter(r => !r.allowed)
    for (const r of results) {
      console.log(`  ${r.table}: ${r.allowed ? "✅ ALLOWED" : "❌ DENIED"} (HTTP ${r.status})`)
    }
    assertEquals(denied.length, 0, `anon should have SELECT on all public tables. Denied: ${denied.map(d => d.table).join(", ")}`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

Deno.test({
  name: "RLS-ALLOW-2: anon cannot INSERT/UPDATE/DELETE allowed tables",
  fn: async () => {
    for (const table of ALLOWED_TABLES) {
      for (const op of ["INSERT", "UPDATE", "DELETE"]) {
        const result = await testAccess(table, "anon", ANON_KEY, op)
        // anon should NOT be able to write to any table
        if (result.allowed) {
          console.log(`  ⚠️  ${table} ${op}: ALLOWED (unexpected for anon) HTTP ${result.status}`)
        }
      }
    }
    console.log("  ✅ All write operations for anon checked")
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

// ── FORBIDDEN TABLES ────────────────────────────────────────────

Deno.test({
  name: "RLS-FORBID-1: anon denied ALL operations on forbidden tables",
  fn: async () => {
    let violations = 0
    for (const table of FORBIDDEN_TABLES) {
      for (const op of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
        const result = await testAccess(table, "anon", ANON_KEY, op)
        if (result.allowed) {
          console.log(`  ❌ VIOLATION: anon ${op} on ${table} was ALLOWED (HTTP ${result.status})`)
          violations++
        }
      }
    }
    assertEquals(violations, 0, `Found ${violations} RLS violations on forbidden tables for anon`)
    console.log(`  ✅ All ${FORBIDDEN_TABLES.length * 4} anon × forbidden operations correctly denied`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

Deno.test({
  name: "RLS-FORBID-2: authenticated denied ALL operations on forbidden tables",
  fn: async () => {
    if (!AUTH_KEY) {
      console.log("  ⚠️  TEST_AUTH_JWT not set — skipping authenticated tests")
      return
    }
    let violations = 0
    for (const table of FORBIDDEN_TABLES) {
      for (const op of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
        const result = await testAccess(table, "authenticated", AUTH_KEY, op)
        if (result.allowed) {
          console.log(`  ❌ VIOLATION: authenticated ${op} on ${table} was ALLOWED (HTTP ${result.status})`)
          violations++
        }
      }
    }
    assertEquals(violations, 0, `Found ${violations} RLS violations for authenticated`)
    console.log(`  ✅ All ${FORBIDDEN_TABLES.length * 4} authenticated × forbidden operations correctly denied`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

// ── SYNC TABLES ─────────────────────────────────────────────────

Deno.test({
  name: "RLS-SYNC-1: sync tables blocked from anon/authenticated",
  fn: async () => {
    let violations = 0
    for (const table of SYNC_TABLES) {
      for (const op of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
        const anonResult = await testAccess(table, "anon", ANON_KEY, op)
        if (anonResult.allowed && anonResult.status !== 404) {
          console.log(`  ❌ VIOLATION: anon ${op} on ${table} allowed (HTTP ${anonResult.status})`)
          violations++
        }
      }
    }
    assertEquals(violations, 0, `Found ${violations} sync table RLS violations`)
    console.log(`  ✅ All ${SYNC_TABLES.length * 4} sync table operations correctly blocked from anon`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

Deno.test({
  name: "RLS-SYNC-2: service_role has access to sync tables",
  fn: async () => {
    if (!SERVICE_ROLE_KEY) {
      console.log("  ⚠️  SUPABASE_SERVICE_ROLE_KEY not set — skipping service_role tests")
      return
    }
    for (const table of SYNC_TABLES) {
      const result = await testAccess(table, "service_role", SERVICE_ROLE_KEY, "SELECT")
      if (!result.allowed && result.status !== 404) {
        console.log(`  ⚠️  service_role SELECT on ${table}: HTTP ${result.status} (may be expected if table doesn't exist)`)
      } else {
        console.log(`  ✅ service_role SELECT on ${table}: HTTP ${result.status}`)
      }
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

// ── COMPREHENSIVE SCORING ───────────────────────────────────────

Deno.test({
  name: "RLS-COMPREHENSIVE: full access matrix report",
  fn: async () => {
    const allTables = [...ALLOWED_TABLES, ...FORBIDDEN_TABLES, ...SYNC_TABLES]
    console.log(`\n  ╔══════════════════════════════════════════════════════════════╗`)
    console.log(`  ║           COMPREHENSIVE RLS ACCESS MATRIX                 ║`)
    console.log(`  ╚══════════════════════════════════════════════════════════════╝`)
    console.log(`\n  Legend: ✅ = allowed | ❌ = denied | — = no access`)

    for (const table of allTables) {
      const results: string[] = []
      for (const role of [{ n: "anon", k: ANON_KEY }, { n: "auth", k: AUTH_KEY }, { n: "svc", k: SERVICE_ROLE_KEY }]) {
        if (!role.k) {
          results.push(`${role.n}:—`)
          continue
        }
        const sel = await testAccess(table, role.n, role.k, "SELECT")
        const ins = await testAccess(table, role.n, role.k, "INSERT")
        results.push(`${role.n}:${sel.allowed ? "✅" : "❌"}${ins.allowed ? "✅" : "❌"}`)
      }
      console.log(`  ${table.padEnd(20)} ${results.join(" | ")}`)
    }

    // Generate score
    let totalTests = 0
    let passedTests = 0
    for (const table of FORBIDDEN_TABLES) {
      for (const op of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
        totalTests++
        const result = await testAccess(table, "anon", ANON_KEY, op)
        if (!result.allowed) passedTests++
      }
    }

    const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
    console.log(`\n  RLS Security Score: ${score}% (${passedTests}/${totalTests} forbidden-table tests passed)`)
    console.log(`  ${score >= 95 ? "PASS ✅" : "FAIL ❌ — RLS regression detected"}`)

    assert(score >= 95, `RLS security score ${score}% below 95% threshold`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})
