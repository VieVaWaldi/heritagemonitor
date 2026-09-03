import {pgTable, serial, text, timestamp} from 'drizzle-orm/pg-core'

// Minimal table to prove the full Postgres -> api -> web chain works.
// Not meant to model anything real yet — see RULES.md before adding real domain tables.
export const healthChecks = pgTable('health_checks', {
    id: serial('id').primaryKey(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})