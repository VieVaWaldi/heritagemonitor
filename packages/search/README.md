# Packages: OpenSearch

OpenSearch holds the scientometric search data which comes from the HPC.

Compiled to `dist/` (same reasoning as `packages/shared` — see its README), via the `libs`
Docker service in dev, or `pnpm --filter @heritagemonitor/search build` outside Docker.

We target 100 Million searchable documents.
Issue: 5 TB of HDD and only 32 GB of RAM.

## ORM

No ORM, its not relational, so we dont do that here -> Using the `official OpenSearch client`.

## Migration

... We dont have a plan for this yet. Maybe thats okay, the core data is owned by the pipeline... 
But we do create the denormalized tables here. right? ....