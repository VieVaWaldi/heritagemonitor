# Packages

## Databases, ORM & Migration

### Postgres

We use Drizzle as an ORM and DrizzleKit for migration

1. Generate: `pnpm db:generate`
    * Drizzle Kit reads our TS schemas, compares it to Postgres and writes .sql describing the differences
2. Human reviews the file
3. Migrate: `pnpm db:migrate`
    * Runs the generated .sql file against Postgres to apply the migration

### OpenSearch

* OS doesnt really have an ORM as its not relational so we just use @opensearch-project/opensearch as a client lib and
  small hand rolled migration scripts we ll have to define later. 

