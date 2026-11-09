import {createHash} from 'node:crypto'
import {existsSync} from 'node:fs'
import {unlink} from 'node:fs/promises'
import {db, schema} from '@heritagemonitor/db'
import {and, desc, eq, gt} from 'drizzle-orm'

// The export_jobs row of one export, from `running` to `completed`/`failed`,
// and the lookup that lets an identical repeat request be served from the
// file a finished job left on disk. Deleting rows and files is the sweep's job
// alone (exports.sweep.ts).

const RETENTION_HOURS = Number(process.env.EXPORT_RETENTION_HOURS) || 24
const RETENTION_MS = RETENTION_HOURS * 60 * 60 * 1000

export type ExportEntity = 'projects' | 'works'

/**
 * sha256 over the request in a canonical form: keys sorted, array values
 * sorted, and absent/empty/false values dropped, so `?funder=A&funder=B` and
 * `?funder=B&funder=A` (or an explicit `excludeTranslated=false`) share a file.
 */
export function hashExportRequest(entity: ExportEntity, request: Record<string, unknown>): string {
    const canonical: Record<string, unknown> = {}
    for (const key of Object.keys(request).sort()) {
        const value = request[key]
        if (value === undefined || value === null || value === false || value === '') continue
        if (Array.isArray(value)) {
            if (value.length > 0) canonical[key] = value.map(String).sort()
            continue
        }
        canonical[key] = value
    }
    return createHash('sha256').update(JSON.stringify({entity, request: canonical})).digest('hex')
}

/** The newest unexpired completed job for this request whose file is still on disk. */
export async function findCachedExport(entity: ExportEntity, requestHash: string, format: string) {
    const [job] = await db
        .select()
        .from(schema.exportJobs)
        .where(
            and(
                eq(schema.exportJobs.entity, entity),
                eq(schema.exportJobs.requestHash, requestHash),
                eq(schema.exportJobs.format, format),
                eq(schema.exportJobs.status, 'completed'),
                gt(schema.exportJobs.expiresAt, new Date()),
            ),
        )
        .orderBy(desc(schema.exportJobs.createdAt))
        .limit(1)

    // The sweep may have removed the file since the row was read: a miss, not an error.
    if (!job?.filePath || !existsSync(job.filePath)) return null
    return {filePath: job.filePath, rowCount: job.rowCount}
}

/**
 * Inserted before the scan starts, with the TEMP path already recorded, so the
 * sweep can clean up after a job that never finished (e.g. an api restart).
 */
export async function insertRunningJob(
    entity: ExportEntity,
    requestHash: string,
    format: string,
    tempPath: string,
): Promise<number> {
    const [row] = await db
        .insert(schema.exportJobs)
        .values({
            entity,
            requestHash,
            format,
            status: 'running',
            filePath: tempPath,
            expiresAt: new Date(Date.now() + RETENTION_MS),
        })
        .returning({id: schema.exportJobs.id})
    return row!.id
}

export async function markJobCompleted(
    id: number,
    result: {filePath: string; fileBytes: number; rowCount: number},
): Promise<void> {
    await db
        .update(schema.exportJobs)
        .set({status: 'completed', ...result, completedAt: new Date()})
        .where(eq(schema.exportJobs.id, id))
}

/** Deletes an export file that may already be gone. Returns the error only if it is still there. */
export async function removeExportFile(filePath: string): Promise<Error | null> {
    try {
        await unlink(filePath)
        return null
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
        return error instanceof Error ? error : new Error(String(error))
    }
}

/** Keeps `filePath`: the sweep still uses it to remove whatever temp file is left. */
export async function markJobFailed(id: number): Promise<void> {
    await db
        .update(schema.exportJobs)
        .set({status: 'failed', completedAt: new Date()})
        .where(eq(schema.exportJobs.id, id))
}
