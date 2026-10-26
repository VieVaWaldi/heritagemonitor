import {index, pgTable, serial, text, timestamp} from 'drizzle-orm/pg-core'

// Where visitors have been, for the team's own /health/breadcrumbs view.
//
// PRIVACY, by construction rather than by policy:
//  - no IP address, no user agent, no account — there is nowhere to put one;
//  - `sessionId` is a random id the browser mints per tab session. It ties a
//    visit's steps together and nothing else, and it is not reused across
//    sessions or devices;
//  - `path` and `query` only: never a fragment, never a full URL with a host,
//    so nothing outside this app can be recorded through it.
//
// Retention is enforced by a sweep in the api (BREADCRUMB_RETENTION_DAYS,
// default 14), matching how request metrics are kept.
export const breadcrumbs = pgTable(
    'breadcrumbs',
    {
        id: serial('id').primaryKey(),
        /** Random per-session id from the browser; not stable across sessions. */
        sessionId: text('session_id').notNull(),
        /** Pathname only, e.g. `/search`. */
        path: text('path').notNull(),
        /** Raw query string without the leading `?`; may be empty. */
        query: text('query').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        // The page reads the newest 100 and the sweep deletes by age; both are
        // this one index.
        index('breadcrumbs_created_at_idx').on(table.createdAt),
    ],
)
