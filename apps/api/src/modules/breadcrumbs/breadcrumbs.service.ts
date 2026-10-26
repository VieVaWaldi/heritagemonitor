import {db, schema} from '@heritagemonitor/db'
import {BREADCRUMB_PAGE_SIZE, type Breadcrumb, type BreadcrumbsResponse} from '@heritagemonitor/shared'
import {desc, lt} from 'drizzle-orm'

// Where visitors have been. Written by the browser on navigation, read by the
// team's /health/breadcrumbs page.
//
// Kept for BREADCRUMB_RETENTION_DAYS, mirroring REQUEST_METRICS_RETENTION_DAYS
// — the two are the same kind of operational record and should age out
// together.

const RETENTION_DAYS = Number(process.env.BREADCRUMB_RETENTION_DAYS) || 14
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000

/**
 * How often the sweep runs. Hourly, not per write: deleting on every insert
 * would put a range delete on the path of a beacon that the browser fires
 * during navigation.
 */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000

export function breadcrumbRetentionDays(): number {
    return RETENTION_DAYS
}

export async function recordBreadcrumb(crumb: Breadcrumb): Promise<void> {
    await db.insert(schema.breadcrumbs).values({
        sessionId: crumb.sessionId,
        path: crumb.path,
        query: crumb.query,
    })
}

export async function recentBreadcrumbs(): Promise<BreadcrumbsResponse> {
    const rows = await db
        .select()
        .from(schema.breadcrumbs)
        .orderBy(desc(schema.breadcrumbs.createdAt), desc(schema.breadcrumbs.id))
        .limit(BREADCRUMB_PAGE_SIZE)

    return {
        rows: rows.map((row) => ({
            id: row.id,
            sessionId: row.sessionId,
            path: row.path,
            query: row.query,
            createdAt: row.createdAt.toISOString(),
        })),
        retentionDays: RETENTION_DAYS,
    }
}

/** Deletes anything past the retention window. Never throws — it is housekeeping. */
export async function sweepBreadcrumbs(log: (message: string) => void): Promise<void> {
    try {
        const cutoff = new Date(Date.now() - RETENTION_MS)
        await db.delete(schema.breadcrumbs).where(lt(schema.breadcrumbs.createdAt, cutoff))
    } catch (error: unknown) {
        log(`breadcrumb sweep failed: ${String(error)}`)
    }
}

/**
 * Starts the hourly sweep. `unref` so a pending timer never holds the process
 * open during a shutdown.
 */
export function startBreadcrumbSweep(log: (message: string) => void): void {
    void sweepBreadcrumbs(log)
    setInterval(() => void sweepBreadcrumbs(log), SWEEP_INTERVAL_MS).unref()
}
