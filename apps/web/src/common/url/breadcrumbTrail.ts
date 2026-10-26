import {BREADCRUMB_SESSION_ID_LENGTH, BREADCRUMB_TRAIL_LENGTH} from '@heritagemonitor/shared'

// The visitor's own recent trail, kept in the tab and handed to Lucy so she
// can see where someone has been before they ask their question.
//
// Pure functions in their own module: the recording RULES (what counts as a
// step, what is a duplicate, how many are kept) are the part worth testing,
// and they have nothing to do with React or the network.

export interface BreadcrumbStep {
    path: string
    query: string
}

/**
 * Params that are written with `replace`, continuously, and must not produce a
 * step of their own.
 *
 * Only the map camera qualifies today: panning writes `view` every few hundred
 * milliseconds, and without this a single drag across Europe would fill the
 * whole trail with the same page at slightly different coordinates. Everything
 * else in the URL is a discrete choice the user made, which is exactly what a
 * trail should record.
 */
const CONTINUOUS_PARAMS = ['view']

/** The query as a step records it: the user's choices, minus the camera. */
export function stepQuery(query: string): string {
    const params = new URLSearchParams(query)
    for (const name of CONTINUOUS_PARAMS) params.delete(name)
    return params.toString()
}

/** `/search?e=grants` — how a step is shown and compared. */
export function formatStep(step: BreadcrumbStep): string {
    return step.query ? `${step.path}?${step.query}` : step.path
}

/**
 * Adds a step to the trail.
 *
 * Consecutive identical steps collapse: the app rewrites its own URL often
 * (a debounced map pan, a re-render landing on the same state), and a trail of
 * ten copies of one page tells Lucy nothing. Non-consecutive repeats are kept
 * — going back to a page after looking elsewhere IS the interesting signal.
 *
 * The newest step is last, and the trail never exceeds BREADCRUMB_TRAIL_LENGTH.
 */
export function pushStep(trail: readonly BreadcrumbStep[], step: BreadcrumbStep): BreadcrumbStep[] {
    const previous = trail[trail.length - 1]
    if (previous && formatStep(previous) === formatStep(step)) return [...trail]
    return [...trail, step].slice(-BREADCRUMB_TRAIL_LENGTH)
}

/**
 * A random per-session id. Not a user id and not stable: it lives in
 * sessionStorage, so it dies with the tab and is never shared across tabs,
 * devices or visits. It exists only to tie one visit's steps together.
 */
export function newSessionId(): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const bytes = new Uint8Array(BREADCRUMB_SESSION_ID_LENGTH)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

/** The trail as Lucy reads it — oldest first, newest marked. */
export function describeTrail(trail: readonly BreadcrumbStep[]): string[] {
    return trail.map((step, index) => `- ${formatStep(step)}${index === trail.length - 1 ? ' (current page)' : ''}`)
}
