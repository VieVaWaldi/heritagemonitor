# Hello Claude

Always read ./README.md to understand the basic rules, folder layout and tech stack.

## Architecture - ALWAYS READ BEFORE WRITING CODE

When working in apps/api always read apps/api/RULES.md.

When working in apps/web always read apps/web/RULES.md.

## Boundary

apps/web never talks to Postgres or OpenSearch directly. It only calls apps/api over HTTP.
This boundary is intentional, do not bypass it for convenience.