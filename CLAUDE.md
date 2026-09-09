# Hello Claude

Always read ./README.md to understand the basic rules, folder layout and tech stack.

Never look for quick hacks or workarounds. Always try to implement clean scalable code, by asking why we are building
this so that we can determine the correct trade-offs together. When in doubt do research online.

## Architecture - ALWAYS READ BEFORE WRITING CODE

When working in apps/api always read apps/api/RULES.md.

When working in apps/web always read apps/web/RULES.md.

## Verification

Everything you create you must verify. That is modules, apis, ui or commands etc behaving as expected.
The human (I) will do the same, but together we are more thorough.

## Boundaries

apps/web never talks to Postgres or OpenSearch directly. It only calls apps/api over HTTP.
This boundary is intentional, do not bypass it for convenience.