import {randomBytes} from 'node:crypto'
import {createReadStream, mkdirSync} from 'node:fs'
import {rename, stat} from 'node:fs/promises'
import path from 'node:path'
import type {ExportFormat, ProjectExportRequest, WorkExportRequest} from '@heritagemonitor/shared'
import type {FastifyReply} from 'fastify'
import {toProjectExportRow} from '../projects/projectExportColumns.js'
import {exportProjects} from '../projects/projects.service.js'
import {toWorkExportRow} from '../works/workExportColumns.js'
import {exportWorks} from '../works/works.service.js'
import {
    findCachedExport,
    hashExportRequest,
    insertRunningJob,
    markJobCompleted,
    markJobFailed,
    removeExportFile,
} from './exportCache.js'
import type {ExportEntity} from './exportCache.js'
import {acquireExportSlot} from './exportQueue.js'
import {createTeeSink, type TeeSink, writeCsv, writeJson} from './exportStream.js'

// The /search download: a search re-run without pagination, streamed to the
// browser and, at the same time, to a file that serves identical requests for
// EXPORT_RETENTION_HOURS. The entity modules own the scan and the columns;
// this module owns the job, the file and the response.

const EXPORT_DIR = process.env.EXPORT_DIR ?? '/data/exports'

const CONTENT_TYPES: Record<ExportFormat, string> = {
    csv: 'text/csv; charset=utf-8',
    json: 'application/json; charset=utf-8',
}

export async function streamProjectExport(request: ProjectExportRequest, reply: FastifyReply): Promise<void> {
    const includeTopic = request.includeTopic === true
    async function* toRows() {
        for await (const detail of exportProjects(request)) yield toProjectExportRow(detail, {includeTopic})
    }
    await runExport('projects', request, reply, `projects-export.${request.format}`, toRows)
}

export async function streamWorkExport(request: WorkExportRequest, reply: FastifyReply): Promise<void> {
    async function* toRows() {
        for await (const detail of exportWorks(request)) yield toWorkExportRow(detail)
    }
    await runExport('works', request, reply, `works-export.${request.format}`, toRows)
}

/**
 * Serves a cached file when there is one, otherwise runs the export under a
 * concurrency slot. Errors before the response starts (queue full, database
 * down) propagate to the central error handler; once bytes are flowing,
 * failures are contained here and end the download as broken.
 */
async function runExport(
    entity: ExportEntity,
    request: ProjectExportRequest | WorkExportRequest,
    reply: FastifyReply,
    filename: string,
    toRows: () => AsyncIterable<Record<string, unknown>>,
): Promise<void> {
    const format = request.format
    const requestHash = hashExportRequest(entity, request)

    const cached = await findCachedExport(entity, requestHash, format)
    if (cached) {
        setDownloadHeaders(reply, filename, format)
        reply.send(createReadStream(cached.filePath))
        return
    }

    const release = await acquireExportSlot()
    try {
        mkdirSync(EXPORT_DIR, {recursive: true})
        // Unique per job: two identical exports running at once must not share a file.
        const finalPath = path.join(EXPORT_DIR, `${entity}-${format}-${requestHash}-${randomBytes(4).toString('hex')}.${format}`)
        const tempPath = `${finalPath}.tmp`
        const jobId = await insertRunningJob(entity, requestHash, format, tempPath)

        setDownloadHeaders(reply, filename, format)
        let sink: TeeSink | null = null
        let streamed = false
        try {
            sink = createTeeSink(reply, tempPath)
            const {rowCount} = format === 'csv' ? await writeCsv(toRows(), sink) : await writeJson(toRows(), sink)
            await sink.end()
            streamed = true

            await rename(tempPath, finalPath)
            const {size} = await stat(finalPath)
            await markJobCompleted(jobId, {filePath: finalPath, fileBytes: size, rowCount})
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error))
            reply.log.warn({err}, `${entity} export failed: ${err.message}`)
            // The client already has every byte once the sink ended; only a
            // download still in flight is broken off.
            if (!streamed) sink?.abort(err)
            await markJobFailed(jobId).catch((dbError: unknown) =>
                reply.log.warn(`could not mark export job ${jobId} failed: ${String(dbError)}`),
            )
            for (const filePath of [tempPath, finalPath]) {
                const removeError = await removeExportFile(filePath)
                if (removeError) reply.log.warn(`could not delete export file ${filePath}: ${removeError.message}`)
            }
        }
    } finally {
        release()
    }
}

function setDownloadHeaders(reply: FastifyReply, filename: string, format: ExportFormat): void {
    reply.header('Content-Disposition', `attachment; filename="${filename}"`)
    reply.header('Content-Type', CONTENT_TYPES[format])
}
