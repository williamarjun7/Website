// Deploy config for reconcile-bookings edge function
// Scheduled: runs every 15 minutes via cron-job.org or Deno Cron
//
// Endpoint: POST /functions/reconcile-bookings
// No auth required (read-only reconciliation logs)
//
// Schedule: */15 * * * *
//
// Env vars required:
//   INSFORGE_BASE_URL or SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY or API_KEY
//   POS_WEBHOOK_URL (optional, for cross-reference)
//   POS_SYNC_API_KEY (optional, for cross-reference)
//
// For InsForge:
//   insforge functions deploy reconcile-bookings --trigger-type schedule --schedule "*/15 * * * *"

export default {
  name: "reconcile-bookings",
  entry: "insforge/functions/reconcile-bookings/index.ts",
  trigger: {
    type: "schedule",
    schedule: "*/15 * * * *",
  },
  env: [
    "INSFORGE_BASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "POS_WEBHOOK_URL",
    "POS_SYNC_API_KEY",
  ],
}
