import {pgTable, serial, text, timestamp} from 'drizzle-orm/pg-core'

export const healthChecks = pgTable('health_checks', {
    id: serial('id').primaryKey(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})
