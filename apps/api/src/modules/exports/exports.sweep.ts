import {db, schema} from '@heritagemonitor/db'
import {and, asc, eq, inArray, isNotNull, lt} from 'drizzle-orm'
import {removeExportFile} from './exportCache.js'

// Housekeeping for export files, same shape as the breadcrumb sweep: expired
// jobs, abandoned jobs, then the disk budget. A row is only ever deleted after
// its file is gone, so no file is left on disk without a row pointing at it.

const STORAGE_CAP_BYTES = Number(process.env.EXPORT_STORAGE_CAP_BYTES) || 20_000_000_000

/** A `running` job this old is abandoned (e.g. the api restarted mid-export), not slow. */
const STUCK_RUNNING_MS = 2 * 60 * 60 * 1000

const SWEEP_INTERVAL_MS = 60 * 60 * 1000

interface SweptJob {
    id: number
    filePath: string | null
}

/** Deletes each job's file, then the rows whose file is confirmed gone. */
async function deleteJobs(jobs: SweptJob[], log: (message: string) => void): Promise<number[]> {
    const deletedIds: number[] = []
    for (const job of jobs) {
        const error = job.filePath ? await removeExportFile(job.filePath) : null
        if (error) log(`export sweep could not delete ${job.filePath}: ${error.message}`)
        else deletedIds.push(job.id)
    }
    if (deletedIds.length > 0) {
        await db.delete(schema.exportJobs).where(inArray(schema.exportJobs.id, deletedIds))
    }
    return deletedIds
}

/** Never throws — it is housekeeping. */
export async function sweepExports(log: (message: string) => void): Promise<void> {
    try {
        const job = {id: schema.exportJobs.id, filePath: schema.exportJobs.filePath}

        const expired = await db.select(job).from(schema.exportJobs).where(lt(schema.exportJobs.expiresAt, new Date()))
        await deleteJobs(expired, log)

        const stuckBefore = new Date(Date.now() - STUCK_RUNNING_MS)
        const stuck = await db
            .select(job)
            .from(schema.exportJobs)
            .where(and(eq(schema.exportJobs.status, 'running'), lt(schema.exportJobs.createdAt, stuckBefore)))
        await deleteJobs(stuck, log)

        // Oldest first; the table only ever holds a few hundred rows, so the sum is done here.
        const completed = await db
            .select({...job, fileBytes: schema.exportJobs.fileBytes})
            .from(schema.exportJobs)
            .where(and(eq(schema.exportJobs.status, 'completed'), isNotNull(schema.exportJobs.fileBytes)))
            .orderBy(asc(schema.exportJobs.createdAt))
        let totalBytes = completed.reduce((sum, row) => sum + (row.fileBytes ?? 0), 0)
        for (const row of completed) {
            if (totalBytes <= STORAGE_CAP_BYTES) break
            const [deletedId] = await deleteJobs([row], log)
            // A file that could not be deleted still takes up the space; move on to the next.
            if (deletedId !== undefined) totalBytes -= row.fileBytes ?? 0
        }
    } catch (error: unknown) {
        log(`export sweep failed: ${String(error)}`)
    }
}

/**
 * Runs once now, then hourly. `unref` so a pending timer never holds the
 * process open during a shutdown.
 */
export function startExportSweep(log: (message: string) => void): void {
    void sweepExports(log)
    setInterval(() => void sweepExports(log), SWEEP_INTERVAL_MS).unref()
}
