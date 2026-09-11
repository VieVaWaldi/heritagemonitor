#!/bin/bash
# Nightly Postgres backup for the HM Postgres container (hm-postgres).
# Dumps run via `docker exec` + a host-side redirect.

set -euo pipefail

HM_DIR="/home/lu72hip/heritagemonitor"
BACKUP_DIR="/home/lu72hip/hm-pg-backups"
RETENTION_COUNT=7   # keep this many most-recent backups, delete the rest

# infra/.env.prod is the single source of truth for POSTGRES_USER/POSTGRES_DB
set -a
source "$HM_DIR/infra/.env.prod"
set +a

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
DUMP_FILE="$BACKUP_DIR/hm-db-$TIMESTAMP.sql.gz"
TMP_FILE="$DUMP_FILE.tmp"

echo "[backup] Dumping $POSTGRES_DB from hm-postgres..."
# --clean --if-exists: dump includes DROP-then-CREATE for every object, not
# just CREATE. Without this, restoring into a database that still has the
# same schema (rolling back a live DB, not just restoring into an empty one) 
# throws "already exists" on every object and duplicate-key errors on every row 
# instead of actually restoring anything.
docker exec hm-postgres pg_dump --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$TMP_FILE"

# Validate before trusting it — an empty or corrupt dump must never replace a
# good backup, and must never trigger rotation of otherwise-good ones.
if [ ! -s "$TMP_FILE" ] || ! gzip -t "$TMP_FILE" 2>/dev/null; then
    echo "[backup] FAILED — dump is empty or corrupt, not keeping it." >&2
    rm -f "$TMP_FILE"
    exit 1
fi

mv "$TMP_FILE" "$DUMP_FILE"
echo "[backup] OK: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

echo "[backup] Rotating — keeping the $RETENTION_COUNT most recent backups..."
ls -1t "$BACKUP_DIR"/hm-db-*.sql.gz 2>/dev/null | tail -n +$((RETENTION_COUNT + 1)) | while read -r old; do
    echo "[backup]   removing $old"
    rm -f "$old"
done

echo "[backup] Done. $(ls -1 "$BACKUP_DIR"/hm-db-*.sql.gz 2>/dev/null | wc -l) backup(s) on disk."
