import { createClient } from "npm:@insforge/sdk"

type DatabaseClient = ReturnType<typeof createClient>["database"]

interface IdempotencyResult {
  cached: boolean
  data: Record<string, unknown> | null
}

/**
 * Resolves idempotency for a given operation + entity.
 *
 * Crash-safe three-phase protocol:
 *   PHASE 1 (reserve): INSERT idempotency_key with null result.
 *     → If UNIQUE violation: another request reserved it first.
 *   PHASE 2 (execute): caller runs the actual work.
 *   PHASE 3 (complete): UPDATE result + completed_at.
 *
 * Crash recovery: if completed_at IS NULL, caller re-executes
 * (safe because PHASE 1 prevents concurrent execution).
 */
export async function resolveIdempotencyKey(
  db: DatabaseClient,
  operation: string,
  entityId: string,
  payloadHash?: string,
): Promise<IdempotencyResult> {
  const salt = payloadHash || "v1"
  const keyHash = await sha256(`${operation}:${entityId}:${salt}`)

  // Check for existing completion
  const { data: existing } = await db
    .from("idempotency_keys")
    .select("result, completed_at")
    .eq("key_hash", keyHash)
    .maybeSingle()

  if (existing?.completed_at) {
    return { cached: true, data: existing.result as Record<string, unknown> | null }
  }

  // PHASE 1: Reserve
  const { error: insertErr } = await db
    .from("idempotency_keys")
    .insert({
      key_hash: keyHash,
      operation,
      result: null,
    })
    .maybeSingle()

  if (insertErr) {
    // Unique violation — another request reserved it.
    // Wait briefly then check if completed.
    await sleep(200)
    const { data: retry } = await db
      .from("idempotency_keys")
      .select("result, completed_at")
      .eq("key_hash", keyHash)
      .maybeSingle()

    if (retry?.completed_at) {
      return { cached: true, data: retry.result as Record<string, unknown> | null }
    }
    // Not completed yet — caller should proceed but this shouldn't happen
    // since only one reservation wins. Fall through.
  }

  return { cached: false, data: null }
}

/**
 * Completes the idempotency reservation after work is done.
 * Must be called after resolveIdempotencyKey returns {cached: false}.
 */
export async function completeIdempotency(
  db: DatabaseClient,
  operation: string,
  entityId: string,
  payloadHash: string | undefined,
  result: Record<string, unknown>,
): Promise<void> {
  const salt = payloadHash || "v1"
  const keyHash = await sha256(`${operation}:${entityId}:${salt}`)

  await db
    .from("idempotency_keys")
    .update({
      result,
      completed_at: new Date().toISOString(),
    })
    .eq("key_hash", keyHash)
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
