#!/usr/bin/env bash
set -euo pipefail

# ==========================================================
# VPS-side deployment & rollback script for Highlands Motel
# Run manually on the VPS for rollback or maintenance.
# ==========================================================

DEPLOY_DIR="${VPS_DEPLOY_PATH:-/var/www/highlands-motel}"
RELEASES_DIR="$DEPLOY_DIR/releases"
CURRENT_LINK="$DEPLOY_DIR/current"
PREVIOUS_LINK="$DEPLOY_DIR/previous"
LOCK_FILE="/tmp/highlands-deploy.lock"
KEEP_RELEASES=5

usage() {
  cat <<EOF
Usage: $(basename "$0") <command>

Commands:
  status            Show current and previous releases
  rollback          Rollback to previous release
  list              List all releases
  cleanup           Remove old releases (keep last $KEEP_RELEASES)
  nginx:test        Test Nginx config
  nginx:reload      Reload Nginx

EOF
  exit 0
}

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
error(){ log "ERROR: $*" >&2; exit 1; }

acquire_lock() {
  exec 200>"$LOCK_FILE"
  flock -n 200 || error "Another deploy is in progress (lock: $LOCK_FILE)"
}

cleanup_old_releases() {
  local releases
  releases=$(ls -dt "$RELEASES_DIR"/*/ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)))
  if [ -n "$releases" ]; then
    echo "$releases" | xargs -r sudo rm -rf
    log "Cleaned up old releases"
  fi
}

status_info() {
  echo "=== Deployment Status ==="
  echo "Deploy path: $DEPLOY_DIR"

  if [ -L "$CURRENT_LINK" ]; then
    echo "Current:  $(readlink -f "$CURRENT_LINK")"
  else
    echo "Current:  (none)"
  fi

  if [ -L "$PREVIOUS_LINK" ]; then
    echo "Previous: $(readlink -f "$PREVIOUS_LINK")"
  else
    echo "Previous: (none)"
  fi

  echo ""
  echo "Releases:"
  ls -lt "$RELEASES_DIR" 2>/dev/null | head -n 10 || echo "  (none)"
}

case "${1:-help}" in
  status)
    status_info
    ;;

  rollback)
    acquire_lock
    if [ ! -L "$PREVIOUS_LINK" ]; then
      error "No previous release to rollback to"
    fi

    PREV_TARGET=$(readlink -f "$PREVIOUS_LINK")
    log "Rolling back to: $PREV_TARGET"

    ln -sfn "$CURRENT_LINK" "${CURRENT_LINK}.rollback-tmp"
    ln -sfn "$PREV_TARGET" "$CURRENT_LINK"
    ln -sfn "$(readlink -f "${CURRENT_LINK}.rollback-tmp")" "$PREVIOUS_LINK"
    rm -f "${CURRENT_LINK}.rollback-tmp"

    sudo chown -R www-data:www-data "$CURRENT_LINK"
    sudo nginx -t && sudo systemctl reload nginx
    log "Rollback complete"
    ;;

  list)
    echo "Releases (newest first):"
    ls -lt "$RELEASES_DIR" 2>/dev/null | head -n 20 || echo "  (none)"
    ;;

  cleanup)
    acquire_lock
    cleanup_old_releases
    log "Cleanup complete"
    ;;

  nginx:test)
    sudo nginx -t
    ;;

  nginx:reload)
    sudo nginx -t && sudo systemctl reload nginx
    log "Nginx reloaded"
    ;;

  *)
    usage
    ;;
esac
