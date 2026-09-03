# Rules of Node Tao

## Architecture

**1. Structure the application in modules, not by technical responsibility**

- MVC (controllers/models/views folders) separates by *technical* responsibility, not *domain* responsibility — a folder
  full of controllers tells you nothing about what the app does
- Structure by domain modules instead: one folder per part of the business (`user/`, `order/`, `catalog/`), each
  containing its own handlers, service, queries, tests
- No single pattern for what's inside a module — a finance app and a medical app should look different, because their
  domains differ

**2. Start with a modular monolith**

- Prefer a monolith over microservices at first; microservices solve real problems but add distributed-systems
  complexity too early
- Treat each module as a *potential* future service — communicate between modules only through their public service
  functions (contracts), so extraction later is cheap
- Monoliths let you move fast in semi-isolation as long as you keep modularity disciplined

**3. Split the implementation into layers (transport → domain → data access)**

- The core design flaw of most Node apps: handlers do everything — validation, business logic, DB calls — all in one
  function
- Extract non-transport logic into a **service**: the handler deals only with HTTP, the service deals with domain + data
  logic, agnostic of whether it's serving HTTP, a queue message, or anything else
- Extract data access further into a **repository**: the service becomes pure business logic, delegating storage details
  away
- Result: transport, domain, and data-access layers change independently — swapping REST for gRPC or Kafka ingestion
  touches only the transport layer
- Caveat: not every app needs this. Start with just handlers; add layers as complexity grows, don't front-load it

**4. Use services to communicate between modules**

- When a use case spans two modules (e.g., updating a user's address while placing an order), don't reach into another
  module's DB table directly
- Call the *other module's service function* instead — this preserves the boundary and means extracting a module into
  its own service later requires zero changes to callers

**5. Create domain entities — don't leak storage shape into your app**

- Don't return data straight from storage in the shape the DB happens to use (e.g. DynamoDB's generic `GSIPK`/`GSISK`
  columns)
- Map to a domain entity as early as possible, ideally right in the repository layer, so the rest of the app never has
  to know about storage-specific field names
- The domain layer is the "heart" of the app — keep it decoupled from any specific store

**6. Separate utility functions from domain logic**

- A generic `utils/` folder becomes a dumping ground for business logic that just doesn't have an obvious home — this
  defeats the purpose of modular structure
- Test: is this reusable and storage/domain-agnostic (true utility, e.g. `capitalize.js`)? Or is it business-specific (
  e.g. `calculate-shipping.js`)? The latter belongs *inside* the owning module, not in `utils/`

**7. Validate request structure with a schema library, in middleware**

- Don't hand-roll field checks in the handler — use Fastify's built-in schema option (body, params, querystring,
  headers),
  which validates via Ajv before your handler ever runs
- Define schemas next to the route, or in a shared schema file per module, so validation stays declarative and out of
  handler logic — this keeps the handler on the happy path, same goal as Express + Joi, just without needing a separate
  library

**8. Middleware follows the same rule as handlers — no business logic inside**

- Middleware has access to the raw request, so it's still transport layer
- It should decide continue-vs-stop, but delegate actual logic (e.g., a permissions check) to a service call — don't
  query the DB directly inside middleware
- Naming tip: prefer generic names (`hasPermissions` over `hasAdminAccess`) since the underlying logic will change more
  often than the shape of the check

**9. Favor plain handler functions over controller classes**

- No real benefit to wrapping handlers in a class (`UserController`) in a minimalist framework like Fastify or Express —
  you're not
  extending a base class that needs it
- If you need shared state or injected dependencies, use a factory function that returns handler functions — this also
  makes testing without mocks much easier

**10. Use (or extend) the built-in `Error` object — never throw raw strings**

- `throw` accepts any value in JS, but only `Error` preserves the stack trace and supports `instanceof` checks other
  tools rely on
- Extend it (e.g. `AppError` with `statusCode` and an `isOperational` flag) to carry HTTP-relevant info up to the
  transport layer, rather than creating many narrow error subclasses

**11. Centralize error handling — don't handle errors ad hoc per-handler**

- One error-handling module/middleware that all handlers `next(err)` into, plus a hook on `uncaughtException`
- The domain layer should just throw plain `Error`s; only the transport layer should enrich/format them for the response
- Send 404s from a catch-all middleware placed after all routes, not scattered checks
- Don't send error *responses* directly inside the handler — delegate, and keep the handler code on the happy path

**12. Shut down when you can't recover**

- Log the error, then let the process exit (`process.exit(1)`) rather than guessing at recovery for
  unknown/non-operational errors — trust the environment (e.g. container orchestrator) to restart it
- Also explicitly listen for OS signals (`SIGTERM`, `uncaughtException`) so you can close connections gracefully before
  dying

**13. Co-locate functionality; group into sub-folders once a module gets big**

- Default rule: keep something as close as possible to where it's used. Only lift it to a shared/common location once
  more than one module needs it
- When a module's file list grows unreadable (e.g. 5+ files just for shipping-cost calculation), nest them into a
  sub-folder with its own `index.js` as the single entry point — callers reference the sub-module, not individual files
  inside it

**14. Keep routes owned by their module, not centralized in one router file**

- A single global routes file becomes a hotspot multiple engineers touch simultaneously
- In Fastify, each module exports its own plugin (a function taking (fastify, opts)) that registers its own routes and
  schemas; the top-level app just fastify.register()s each module's plugin with a prefix
- Fastify plugins are also encapsulated by default — decorators/hooks registered inside a module's plugin don't leak
  into sibling modules unless you explicitly use fastify-plugin to break encapsulation

**15. Prefix API routes with a version**

- Always prefix (`/v1/...`) even if you don't plan breaking changes yet — this gives you a free escape hatch for future
  incompatible changes without disrupting existing clients

**16. Attach the authenticated user once, don't re-derive it per handler**

- After auth, attach the user object to `res.locals` (typed as `Record<string, any>` — easier for TS than augmenting
  `req`) so downstream middleware/handlers can use it without re-fetching or re-decoding a token

**17. Avoid callback-based APIs — use Promises**

- Legacy callback-based Node APIs (`fs.open(cb)`) nest into "callback hell" that's hard to follow
- Use the Promise-based equivalents (`fs/promises`) with `async/await` wherever available