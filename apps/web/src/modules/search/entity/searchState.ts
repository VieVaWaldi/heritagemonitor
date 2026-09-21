import {MAX_PAGE} from '@heritagemonitor/shared'

// Formatting and wording of "what is currently on screen", shared by the
// results header (for the user) and the chat context (for Lucy), so the two
// can never disagree about how many results there are or which filters are on.

/**
 * A count the api could only approximate, rounded to a precision it can
 * actually stand behind. Printing "3,714,882" for a number that came from a
 * separate, slightly-later `_count` would claim an accuracy nobody has; these
 * bands say as much as is true and no more:
 *
 * - under 10,000 the search itself counted exactly, so this is never needed;
 * - 10,000-99,999 to the nearest hundred ("12,300");
 * - 100,000-999,999 to the nearest thousand ("483k");
 * - a million and up with one decimal ("3.7M", "12M").
 */
export function formatApproxTotal(total: number): string {
    if (total >= 1_000_000) {
        const millions = total / 1_000_000
        const rounded = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10
        return `${rounded}M`
    }
    if (total >= 100_000) return `${Math.round(total / 1_000)}k`
    if (total >= 10_000) return (Math.round(total / 100) * 100).toLocaleString('en-US')
    return total.toLocaleString('en-US')
}

/**
 * The three numbers the search envelope reports about "how many". Field names
 * are the envelope's own, so a response IS a ResultCount — no adapter object
 * between the api's answer and the words shown to the user.
 */
export interface ResultCount {
    /** Exact up to the search's cap; a floor beyond it — see `totalCapped`. */
    estimatedTotalHits: number
    totalCapped: boolean
    /** What a separate `_count` found, when the api managed to run one. */
    approxTotal: number | null
}

/**
 * How many results there are, in words the number can support: the exact
 * figure while the search still counts exactly, "about 3.7M" once the api has
 * a real magnitude from its `_count`, and "10,000+" when even that is missing
 * — never a precise-looking number that is really only a cap.
 */
export function formatResultCount({estimatedTotalHits, totalCapped, approxTotal}: ResultCount): string {
    if (!totalCapped) return estimatedTotalHits.toLocaleString('en-US')
    if (approxTotal != null) return `about ${formatApproxTotal(approxTotal)}`
    return `${estimatedTotalHits.toLocaleString('en-US')}+`
}

export interface ActiveFilterDescription {
    label: string
    values: string[]
}

export interface SearchStateDescription {
    query: string
    corpusName: string
    sortLabel: string | null
    page: number
    pageCount: number
    count: ResultCount
    entityNoun: string
    /** Only what is actually set — an empty list means "no filters". */
    filters: ActiveFilterDescription[]
    /** True when the api had to fall back to typo tolerance. */
    fuzzy?: boolean
    didYouMean?: string[]
}

/**
 * One sentence stating the current URL state in words, as the first line of
 * the chat context — Lucy answers "how many are there?", "what am I looking
 * at?" and "what did I filter on?" from this, not by guessing at the rows.
 */
export function describeSearchState({
    query,
    corpusName,
    sortLabel,
    page,
    pageCount,
    count,
    entityNoun,
    filters,
    fuzzy,
    didYouMean,
}: SearchStateDescription): string {
    const parts = [
        query ? `search "${query}"` : 'no search text (default ranking)',
        `corpus ${corpusName}`,
        sortLabel ? `sorted by ${sortLabel}` : 'default order',
        `page ${page} of ${pageCount}${pageCount >= MAX_PAGE ? ' (the deepest page the search allows)' : ''}`,
        `${formatResultCount(count)} matching ${entityNoun}`,
    ]

    const active = filters.filter((filter) => filter.values.length > 0)
    parts.push(
        active.length > 0
            ? `filters: ${active.map((filter) => `${filter.label} = ${filter.values.join(', ')}`).join('; ')}`
            : 'no filters applied',
    )

    const sentence = `The user is looking at the ${entityNoun} results for ${parts.join(', ')}.`
    if (!fuzzy) return sentence

    // Lucy must not present typo-corrected results as if they were what was
    // asked for: the user's own spelling matched almost nothing.
    const correction = didYouMean?.length ? ` The index suggests: ${didYouMean.join(', ')}.` : ''
    return `${sentence} The exact query matched almost nothing, so these are TYPO-TOLERANT results for a similar spelling.${correction}`
}
