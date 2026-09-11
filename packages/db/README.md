# Packages: Postgres

Postgres holds real state (user settings etc).

Compiled to `dist/` , via the `libs` Docker service in dev, 
or `pnpm --filter @heritagemonitor/db build` outside Docker.
`drizzle.config.ts` is not part of this build; drizzle-kit loads it directly.

## ORM

Is drizzle.

## Migration

Check existing tables with: `docker exec hm-postgres psql -U hm_admin -d hm_db -c "\dt"`.

We use Drizzle as an ORM and DrizzleKit for migration, so whenever you change `packages/db/src/schema` you have to:

1. Generate: `pnpm db:generate`
    * Drizzle Kit reads our TS schemas, compares it to Postgres and writes .sql describing the differences
2. Human reviews the migration file
3. Migrate: `pnpm db:migrate`
    * Runs the generated .sql file against Postgres to apply the migration

## Backups

**How it works**: `backup.sh` runs `pg_dump` inside the `hm-postgres` container and redirects
the (gzipped) output to a file on the *host*. A systemd timer runs it nightly at 03:00.

**Where backups land**: `~/hm-pg-backups/`.

**Retention**: the 7 most recent backups, oldest deleted automatically after each new one.
Tune `RETENTION_COUNT` at the top of `backup.sh`.

A dump is validated (non-empty, passes `gzip -t`) before it's kept, a failed/corrupt dump
never overwrites a good backup, and never triggers rotation of the ones that were already good.

### One-time install (needs sudo)

```bash
sudo cp packages/db/systemd/hm-pg-backup.service packages/db/systemd/hm-pg-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now hm-pg-backup.timer
```

Verify: `systemctl list-timers hm-pg-backup.timer` shows the next scheduled run.

### Destructive Restore

```bash
packages/db/restore.sh              # restores the most recent backup
packages/db/restore.sh <path>       # restores a specific one — see ls ~/hm-pg-backups/
```

### Manual run / sanity check

```bash
packages/db/backup.sh                    # run one backup right now, outside the schedule
ls -lh ~/hm-pg-backups/                  # see what's actually on disk
systemctl status hm-pg-backup.timer      # confirm the timer is actually active
journalctl -u hm-pg-backup.service       # backup run history/output
```
