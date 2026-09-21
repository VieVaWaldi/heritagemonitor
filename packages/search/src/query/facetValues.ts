import {termsAgg, type TermsAggregation} from './aggregations.js'

// Type-ahead over the VALUES of a keyword field, for facets too large to ship
// whole (`programme` has ~4,500 values). The filtering happens inside the
// terms aggregation via `include`, so the counts stay the counts for the
// user's current query and filters — a separate lookup table could not do
// that.

/**
 * Characters Lucene's regexp engine treats as syntax. `include` is a Lucene
 * regexp, NOT a PCRE: a raw `(` or `[` from user input is a parse error, and
 * a raw `.` or `*` would silently match more than the user typed.
 */
const LUCENE_REGEXP_SYNTAX = /[.?+*|{}[\]()"\\#@&<>~]/u

/**
 * Lucene regexp has no `(?i)` flag, so case-insensitivity is spelled out per
 * character: `h` becomes `[hH]`. Characters without a case (digits, `_`, `-`)
 * are passed through, escaped where they mean something to the engine.
 */
function caseInsensitiveLiteral(text: string): string {
    return [...text]
        .map((character) => {
            const lower = character.toLowerCase()
            const upper = character.toUpperCase()
            if (lower !== upper) return `[${lower}${upper}]`
            return LUCENE_REGEXP_SYNTAX.test(character) ? `\\${character}` : character
        })
        .join('')
}

/**
 * A Lucene regexp matching any value that CONTAINS `q`, ignoring case.
 * `include` is anchored (it must match the whole term), hence the `.*` on
 * both sides. An empty query means "no restriction" — the caller then gets
 * the plain top-N by count.
 */
export function containsRegexp(q: string): string | null {
    const trimmed = q.trim()
    if (!trimmed) return null
    return `.*${caseInsensitiveLiteral(trimmed)}.*`
}

/** Never let a client ask for a bucket list long enough to be a denial of service. */
export const MAX_FACET_VALUES = 100

export interface FacetValuesOptions {
    /** Free text the value must contain; empty means top-N by count. */
    q?: string
    size?: number
}

/**
 * The aggregation for one facet's value list. `shard_size` comes from
 * `termsAgg`, so these counts are as exact as every other facet's.
 */
export function facetValuesAgg(field: string, {q = '', size = 20}: FacetValuesOptions = {}): TermsAggregation {
    const capped = Math.min(Math.max(1, size), MAX_FACET_VALUES)
    const include = containsRegexp(q)
    const aggregation = termsAgg(field, capped)
    return include ? {terms: {...aggregation.terms, include}} : aggregation
}
