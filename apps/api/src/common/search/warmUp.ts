import {CORPUS_KEYS, type Corpus} from '@heritagemonitor/shared'

// Fills the default-page cache before anyone asks for it (plan F0-12).
//
// WHY: the blank default page of each entity is what every visitor sees first,
// and it is the single most expensive search the app runs — on the VM's cold
// HDD the first `works` default took seconds, and the first visitor after a
// deploy paid all of it. The answer is identical for everyone, so it may as
// well be computed while nobody is waiting.
//
// This runs AFTER `listen`, never before: a warm-up that delayed the port
// would turn a slow index into a failed deploy. Everything here is
// best-effort — the cache is an optimisation, and a warm-up that fails just
// means the first visitor pays what they pay today.

/** What a warm-up does. Returning normally means done; throwing is logged and ignored. */
export interface WarmUpTask {
    name: string
    run: () => Promise<unknown>
}

const tasks: WarmUpTask[] = []

/**
 * Adds a task to the warm-up.
 *
 * Registration is a function rather than a list in this file so that a feature
 * owns its own warm-up next to its own code, and so that a route that does not
 * exist yet simply never registers one — see the funding map hook in
 * `index.ts`.
 */
export function registerWarmUp(task: WarmUpTask): void {
    tasks.push(task)
}

type SearchFunction = (request: {c?: Corpus; page?: number}) => Promise<unknown>

/**
 * Registers the blank default page of an entity, for every corpus.
 *
 * Only page 1: it is the one almost everyone sees, and warming pages 2-5 as
 * well would multiply the boot cost by five to prefetch pages most visitors
 * never reach. They still get cached on first request.
 */
export function registerDefaultPageWarmUp(entity: string, search: SearchFunction): void {
    for (const corpus of CORPUS_KEYS) {
        registerWarmUp({
            name: `${entity}:${corpus}`,
            run: () => search({c: corpus, page: 1}),
        })
    }
}

export interface WarmUpLogger {
    info: (message: string) => void
    warn: (message: string) => void
}

/**
 * Runs every registered task, one at a time, and reports how long each took.
 *
 * Sequential on purpose: these are the heaviest queries the app makes, and
 * firing them at once would have the api compete with its own first real
 * visitors for the cluster. Boot is not a deadline — being slightly late to a
 * warm cache costs nothing, a stalled search costs a page view.
 *
 * Never throws and never rejects.
 */
export async function runWarmUp(log: WarmUpLogger): Promise<void> {
    if (tasks.length === 0) return

    const startedAt = Date.now()
    let failed = 0

    for (const task of tasks) {
        const taskStartedAt = Date.now()
        try {
            await task.run()
            log.info(`warm-up ${task.name}: ${Date.now() - taskStartedAt} ms`)
        } catch (error: unknown) {
            failed += 1
            log.warn(`warm-up ${task.name} failed after ${Date.now() - taskStartedAt} ms: ${String(error)}`)
        }
    }

    log.info(`warm-up finished: ${tasks.length - failed}/${tasks.length} tasks in ${Date.now() - startedAt} ms`)
}

/** Test seam: the registry is module state, so a test must be able to empty it. */
export function clearWarmUpTasks(): void {
    tasks.length = 0
}
