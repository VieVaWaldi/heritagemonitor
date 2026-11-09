import {AppError} from '../../plugins/errors.js'

// How many exports may scan OpenSearch at once. An in-process semaphore, not a
// job queue: there is one hm-api container, and an export lives exactly as long
// as the HTTP response it streams into.

const MAX_CONCURRENCY = Number(process.env.EXPORT_MAX_CONCURRENCY) || 4
const MAX_QUEUE_WAIT_MS = Number(process.env.EXPORT_MAX_QUEUE_WAIT_MS) || 30_000

let active = 0
const waiters: Array<() => void> = []

/**
 * Resolves with a release function once a slot is free, or throws a 503 after
 * MAX_QUEUE_WAIT_MS. Call the release exactly once (extra calls are ignored).
 */
export async function acquireExportSlot(): Promise<() => void> {
    if (active < MAX_CONCURRENCY) {
        active += 1
        return createRelease()
    }

    await new Promise<void>((resolve, reject) => {
        const waiter = () => {
            clearTimeout(timer)
            resolve()
        }
        const timer = setTimeout(() => {
            waiters.splice(waiters.indexOf(waiter), 1)
            reject(new AppError('Too many exports running right now — try again in a moment.', 503))
        }, MAX_QUEUE_WAIT_MS)
        waiters.push(waiter)
    })
    // The releasing export handed its slot straight over, so `active` is unchanged.
    return createRelease()
}

function createRelease(): () => void {
    let released = false
    return () => {
        if (released) return
        released = true
        const next = waiters.shift()
        if (next) next()
        else active -= 1
    }
}
