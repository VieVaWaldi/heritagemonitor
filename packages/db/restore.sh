#!/bin/bash
# Restores the HM Postgres database from a backup made by backup.sh.
#
# Usage:
#   ./restore.sh              # restores the most recent backup
#   ./restore.sh <path>       # restores a specific backup file
#   add -y / --yes to skip the confirmation prompt (e.g. for scripting)
#
# DESTRUCTIVE — overwrites whatever is currently in the database with the
# backup's contents. Confirms before doing anything unless -y/--yes is passed.

set -euo pipefail

HM_DIR="/home/lu72hip/heritagemonitor"
BACKUP_DIR="/home/lu72hip/hm-pg-backups"

set -a
source "$HM_DIR/infra/.env.prod"
set +a

FORCE=false
TARGET=""
for arg in "$@"; do
    case "$arg" in
        -y|--yes) FORCE=true ;;
        *) TARGET="$arg" ;;
    esac
done

if [ -z "$TARGET" ]; then
    TARGET="$(ls -1t "$BACKUP_DIR"/hm-db-*.sql.gz 2>/dev/null | head -n 1)"
    if [ -z "$TARGET" ]; then
        echo "No backups found in $BACKUP_DIR" >&2
        exit 1
    fi
fi

if [ ! -f "$TARGET" ]; then
    echo "Backup file not found: $TARGET" >&2
    exit 1
fi

echo "About to restore $TARGET into database '$POSTGRES_DB' on hm-postgres."
echo "THIS OVERWRITES the current contents of that database."
if [ "$FORCE" != true ]; then
    read -rp "Type 'yes' to continue: " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 1
    fi
fi

echo "[restore] Restoring from $TARGET..."
gunzip -c "$TARGET" | docker exec -i hm-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo "[restore] Done."
