import {bigint, index, integer, pgTable, serial, text, timestamp} from 'drizzle-orm/pg-core'

// Tracks background export jobs started from /search's download feature.
// Lets (a) an identical repeat request within the retention window be served
// from the cached file instead of re-scanning OpenSearch, and (b) an hourly
// sweep (added later) find and delete rows past `expiresAt`.
export const exportJobs = pgTable(
    'export_jobs',
    {
        id: serial('id').primaryKey(),
        /** 'projects' | 'works' */
        entity: text('entity').notNull(),
        /** sha256 hex of the normalized request (filters + format + toggles). */
        requestHash: text('request_hash').notNull(),
        /** 'csv' | 'json' */
        format: text('format').notNull(),
        /** 'running' | 'completed' | 'failed' */
        status: text('status').notNull(),
        /** Set once the file is written. */
        filePath: text('file_path'),
        fileBytes: bigint('file_bytes', {mode: 'number'}),
        rowCount: integer('row_count'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        completedAt: timestamp('completed_at'),
        /** createdAt + EXPORT_RETENTION_HOURS, set by application code. */
        expiresAt: timestamp('expires_at').notNull(),
    },
    (table) => [
        // Cache lookup: find a completed job for the same normalized request.
        index('export_jobs_request_hash_idx').on(table.requestHash),
        // The retention sweep's delete-where-expired query.
        index('export_jobs_expires_at_idx').on(table.expiresAt),
    ],
)
