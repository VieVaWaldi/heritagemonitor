# Packages: Postgres

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
