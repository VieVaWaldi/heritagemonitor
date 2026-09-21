import {MAX_PAGE} from '@heritagemonitor/shared'

// Formatting and wording of "what is currently on screen", shared by the
// results header (for the user) and the chat context (for Lucy) so the two
// can never disagree about how many results there are.

/**
 * A total the api could only count up to 10,000 is shown as "10,000+", never
 * as a precise number it is not — see `totalCapped` in the shared envelope.
 */
export function formatTotal(total: number, capped: boolean): string {
    const formatted = total.toLocaleString('en-US')
    return capped ? `${formatted}+` : formatted
}

export interface SearchStateDescription {
    query: string
    corpusName: string
    sortLabel: string | null
    page: number
    pageCount: number
    total: number
    totalCapped: boolean
    entityNoun: string
}

/**
 * One sentence stating the current URL state in words, as the first line of
 * the chat context — Lucy answers "how many are there?" and "what am I
 * looking at?" from this, not from guessing at the row list.
 */
export function describeSearchState({
    query,
    corpusName,
    sortLabel,
    page,
    pageCount,
    total,
    totalCapped,
    entityNoun,
}: SearchStateDescription): string {
    const parts = [
        query ? `search "${query}"` : 'no search text (default ranking)',
        `corpus ${corpusName}`,
        sortLabel ? `sorted by ${sortLabel}` : 'default order',
        `page ${page} of ${pageCount}${pageCount >= MAX_PAGE ? ' (the deepest page the search allows)' : ''}`,
        `${formatTotal(total, totalCapped)} matching ${entityNoun}`,
    ]
    return `The user is looking at the ${entityNoun} results for ${parts.join(', ')}.`
}
