// The pure decisions behind "the open row no longer matches the filters".
// Kept free of React and `@/` aliases so Node's test runner can exercise them
// (see test/selectionFallback.test.ts); useSelectedEntity is the thin wiring.

/** How long the "your selection no longer matches" notice stays up. */
export const SELECTION_NOTICE_MS = 5_000

/** The verdict of useSelectionSurvival. `unknown` while the check is in flight. */
export type SelectionVerdict = 'unknown' | 'matches' | 'dropped'

export interface SelectionResolution {
    /** The id the panel must show. */
    selectedId: string | null
    /** True when the requested row was dropped: the URL must be corrected and the notice raised. */
    dropped: boolean
}

/**
 * Which row the panel shows, given what the URL asks for.
 *
 * Kept (`matches` / `unknown`): the requested id — `unknown` keeps it so a
 * transient failure or an in-flight check never swaps the document.
 * Dropped: the first listed row (or nothing when the list is empty).
 */
export function resolveSelection(requestedId: string | null, firstRowId: string | null, verdict: SelectionVerdict): SelectionResolution {
    if (requestedId !== null && verdict === 'dropped') return {selectedId: firstRowId, dropped: true}
    return {selectedId: requestedId, dropped: false}
}

/**
 * The URL patch that keeps the address bar in agreement with the panel after
 * a drop: `sel` is cleared (no `sel` already means "first row of the current
 * list"), as a `replace` so the correction is not a back-button step.
 * `null` when there is nothing to correct.
 */
export function selectionUrlCorrection(dropped: boolean): {sel: null; history: 'replace'} | null {
    return dropped ? {sel: null, history: 'replace'} : null
}

/** Whether the notice is showing: raised at `raisedAt`, gone after SELECTION_NOTICE_MS. */
export function isSelectionNoticeVisible(raisedAt: number, now: number): boolean {
    return raisedAt !== 0 && now < raisedAt + SELECTION_NOTICE_MS
}
