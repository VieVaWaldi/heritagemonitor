import {createWriteStream} from 'node:fs'
import {PassThrough, type Writable} from 'node:stream'
import {stringify} from 'csv-stringify/sync'
import type {FastifyReply} from 'fastify'

// Serialises export rows into the HTTP response and a cache file at the same
// time, one row in flight at a time. Nothing here ever holds more than a
// stream buffer's worth of output: the api runs in ~1.1 GB of heap and an
// export can be a million rows.

export interface TeeSink {
    /** Resolves once both the response and the file can take more. */
    write(chunk: string): Promise<void>
    /** Resolves once the cache file is fully flushed to disk. */
    end(): Promise<void>
    /** Breaks the response (so the client sees a failed download, not a short file) and closes the file. */
    abort(error: Error): void
}

/**
 * Writes go to the response and the file SEPARATELY rather than piping one
 * PassThrough into both: Fastify attaches its pipe only after the async
 * onSend hooks (compress, no-store) have run, and a stream already flowing
 * into the file would hand the first chunks to the file alone.
 */
export function createTeeSink(reply: FastifyReply, filePath: string): TeeSink {
    const output = new PassThrough()
    const file = createWriteStream(filePath)

    // Every wait below races against this, so a broken side never leaves a write hanging.
    let failure: Error | null = null
    let rejectFailed!: (error: Error) => void
    const failed = new Promise<never>((_, reject) => {
        rejectFailed = reject
    })
    failed.catch(() => {}) // observed through the races; never an unhandled rejection
    const fail = (error: Error) => {
        failure ??= error
        rejectFailed(failure)
    }

    output.on('error', fail)
    file.on('error', fail)
    reply.raw.on('close', () => {
        if (!reply.raw.writableFinished) fail(new Error('client disconnected before the export finished'))
    })

    reply.send(output)

    return {
        async write(chunk) {
            if (failure) throw failure
            const waits: Promise<void>[] = []
            if (!output.write(chunk)) waits.push(drained(output))
            if (!file.write(chunk)) waits.push(drained(file))
            if (waits.length > 0) await Promise.race([Promise.all(waits), failed])
            if (failure) throw failure
        },
        async end() {
            if (failure) throw failure
            const flushed = new Promise<void>((resolve) => file.once('finish', resolve))
            output.end()
            file.end()
            await Promise.race([flushed, failed])
        },
        abort(error) {
            fail(error)
            output.destroy(error)
            file.destroy()
        },
    }
}

/** Never rejects (errors are seen through `failed`), and removes its listeners either way. */
function drained(stream: Writable): Promise<void> {
    return new Promise((resolve) => {
        const done = () => {
            stream.off('drain', done)
            stream.off('close', done)
            resolve()
        }
        stream.on('drain', done)
        stream.on('close', done)
    })
}

/**
 * The header comes from the first row's own key order, which the per-entity
 * row builders control. An export with no rows is therefore an empty file.
 */
export async function writeCsv(
    rows: AsyncIterable<Record<string, unknown>>,
    sink: TeeSink,
): Promise<{rowCount: number}> {
    let columns: string[] | null = null
    let rowCount = 0

    for await (const row of rows) {
        if (!columns) {
            columns = Object.keys(row)
            await sink.write(stringify([columns]))
        }
        await sink.write(stringify([columns.map((column) => toCsvCell(row[column]))]))
        rowCount += 1
    }

    return {rowCount}
}

// One cell per value, the same for every entity: arrays joined with "; ",
// booleans spelled out (csv-stringify's own default is 1/empty).
function toCsvCell(value: unknown): string | number {
    if (value === null || value === undefined) return ''
    if (typeof value === 'number') return value
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (Array.isArray(value)) return escapeFormula(value.map((item) => (item === null || item === undefined ? '' : String(item))).join('; '))
    if (typeof value === 'object') return escapeFormula(JSON.stringify(value))
    return escapeFormula(String(value))
}

// Guards against CSV/spreadsheet formula injection: a cell starting with =, +, -, @, tab or CR
// is executed as a formula by Excel/Sheets/LibreOffice, so a leading ' forces it to stay text.
function escapeFormula(cell: string): string {
    return /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell
}

/** A JSON array, one row at a time; nested values stay native JSON. */
export async function writeJson(
    rows: AsyncIterable<Record<string, unknown>>,
    sink: TeeSink,
): Promise<{rowCount: number}> {
    let rowCount = 0

    await sink.write('[')
    for await (const row of rows) {
        await sink.write((rowCount === 0 ? '' : ',') + JSON.stringify(row))
        rowCount += 1
    }
    await sink.write(']')

    return {rowCount}
}
