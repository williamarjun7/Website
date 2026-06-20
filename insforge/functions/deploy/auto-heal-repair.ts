// Deploy config for auto-heal-repair edge function
// Runs: on-demand (POST) or scheduled (every 15 min)
//
// Endpoint: POST /functions/auto-heal-repair
// Dry-run mode: POST with header x-repair-mode: dry_run
//
// For InsForge:
//   insforge functions deploy auto-heal-repair --trigger-type schedule --schedule "*/15 * * * *"
//
// Env vars required:
//   INSFORGE_BASE_URL or SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY or API_KEY

export default {
  name: "auto-heal-repair",
  entry: "insforge/functions/auto-heal-repair/index.ts",
  trigger: {
    type: "schedule",
    schedule: "*/15 * * * *",
  },
  env: [
    "INSFORGE_BASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
}
