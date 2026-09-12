# yea

Things I'd call blocking for a "reuse this for every future project" template:

1. No tests, anywhere. No vitest/jest, no test files, nothing wired to run them. For a template repo   
   this matters more than for a one-off — a template is supposed to demonstrate how you test a Fastify
   module / a React module, not just how you structure one.
2. No CI. No .github/workflows at all. Nothing enforces that main even builds, let alone lints or      
   tests, before merge. This is normally the cheapest, highest-leverage thing to template once and     
   reuse forever.
3. No lint/format enforcement. README.md says "always format code (WebStorm Option+Shift+F)" — that's a
   human ritual, not a rule. No ESLint config, no Prettier config, nothing in CI or a pre-commit hook  
   to catch drift. Fine solo in one IDE; breaks the moment there's a second contributor or editor.
4. No env var validation at boot. You already have zod as a shared dep, but nothing parses process.env
   on startup anywhere (api reads process.env.CACHE_MAX_ENTRIES etc. raw). A typo'd or missing var     
   currently fails silently/late instead of crashing at boot with a clear message — exactly the kind of
   thing zod is good for and you're already paying for the dependency.

Things your own RULES.md promises but the code doesn't do yet:

5. apps/api/RULES.md #12 says "shut down when you can't recover" — listen for                          
   SIGTERM/uncaughtException, close connections gracefully. index.ts does neither right now.
6. Rate limiting — you flagged this yourself in rmme.md as "before auth" — still absent.

Structural, lower urgency but worth deciding now rather than later:

7. No root package.json. Every workspace re-declares typescript, @types/node, etc. independently, and  
   there's nowhere to put a pnpm -r lint / pnpm -r test root script. Small now, annoying once you have
   5 packages.
8. Dockerfiles are dev-only. Both explicitly punt on a production build (apps/api/Dockerfile even says
   "revisit with multi-stage... once build times hurt", CMD runs dev:debug). Fine for now, but         
   "reusable template" implies you'll eventually want a real prod target — worth at least a stub.
9. No DB seed script. Migrations exist, but a fresh clone has no way to get sample data in without     
   hand-writing SQL.
10. No security headers plugin (@fastify/helmet or equivalent) — minor, but a one-line addition that's
    easy to template once and forget about forever.

I'd rank CI + a minimal test setup as the two to do before this template gets reused a second time —   
everything else is fixable retroactively, but "no CI" means every future project inherits zero safety  
net from day one. Want me to sketch what a minimal .github/workflows/ci.yml (build + typecheck, no     
tests yet since there are none) would look like for this pnpm workspace?   