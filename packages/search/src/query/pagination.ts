// Port of export/queries.py's pagination/total helpers.

/**
 * OpenSearch's `index.max_result_window`: `from + size` may not exceed it.
 * An index fact, not a product decision — the product-side cap derived from
 * it is `MAX_PAGE` in @heritagemonitor/shared (10,000 / 20 = page 500).
 */
export const MAX_RESULT_WINDOW = 10_000

/**
 * `track_total_hits`: totals are exact up to this many and reported as
 * "at least" beyond it. Counting exactly over 50M works is the expensive part
 * of a query; the UI shows "10,000+" instead.
 */
export const TOTAL_CAP = 10_000

export interface PageWindow {
    from: number
    size: number
}

/** 1-based page -> the `from`/`size` window, or null when it is past the 10k window (api: 400). */
export function pageWindow(page: number, size: number): PageWindow | null {
    const from = (Math.max(page, 1) - 1) * size
    if (from >= MAX_RESULT_WINDOW) return null
    return {from, size: Math.min(size, MAX_RESULT_WINDOW - from)}
}

export interface HitTotal {
    value: number
    /** `gte` means "at least `value`" — the count hit TOTAL_CAP. */
    capped: boolean
}

interface TotalShape {
    hits: {total: {value: number; relation?: string} | number}
}

/** Reads `hits.total` back out of a response, whichever shape the server used. */
export function totalOf(response: TotalShape): HitTotal {
    const total = response.hits.total
    if (typeof total === 'number') return {value: total, capped: false}
    return {value: total.value, capped: total.relation === 'gte'}
}
