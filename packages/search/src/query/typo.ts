import {rewriteQuery} from './syntax.js'

// Typo tolerance (D6). Port of export/queries.py's `split_terms`,
// `fuzzy_query`, `suggest_block` and the strict-then-fuzzy strategy of
// `search_typo_tolerant`; the executor half lives in apps/api's runSearch,
// because "when is a result set too small" is a product decision, not a query
// one.
//
// Same Python -> JS regex gotcha as syntax.ts: Python's `\w` is Unicode-aware
// and JS's is ASCII-only, so every word class below is spelled out with
// `\p{L}\p{N}` under the `u` flag.

const WORD = '\\p{L}\\p{N}_'
const NEGATED_TERM = new RegExp(`(?:^|\\s)-([${WORD}][${WORD}-]*)`, 'gu')
const OPERATOR_CHARS = /[+|()"\\]/gu

/**
 * Splits a query into the words that must match and the words that must not.
 *
 * The fuzzy rerun needs plain words, not `simple_query_string` syntax: the
 * operators, quotes and parens are dropped and only `-term` survives, as a
 * negation that stays strict (a typo-tolerant exclusion would exclude too
 * much).
 */
export function splitTerms(q: string): {positive: string; negative: string[]} {
    const rewritten = rewriteQuery(q)

    const negative = [...rewritten.matchAll(NEGATED_TERM)].map((match) => match[1])
    const positive = rewritten
        .replace(new RegExp(`(?:^|\\s)-[${WORD}][${WORD}-]*`, 'gu'), ' ')
        .replace(OPERATOR_CHARS, ' ')
        .replace(/\s+/gu, ' ')
        .trim()

    return {positive, negative}
}

/** How many terms a fuzzy expansion may produce per field — bounds the cost of the rerun. */
export const DEFAULT_MAX_EXPANSIONS = 20

/**
 * The fallback query: every positive word must still match (AND), but with
 * `fuzziness: AUTO` (0 edits up to 2 characters, 1 edit for 3-5, 2 beyond)
 * and `prefix_length: 2` — the first two characters must be right, which is
 * what keeps the candidate-term list small enough to be affordable.
 */
export function fuzzyQuery(q: string, fields: readonly string[], maxExpansions = DEFAULT_MAX_EXPANSIONS): Record<string, unknown> {
    const {positive, negative} = splitTerms(q)
    if (!positive) return {match_all: {}}

    const must = {
        multi_match: {
            query: positive,
            fields: [...fields],
            type: 'best_fields',
            operator: 'and',
            fuzziness: 'AUTO',
            prefix_length: 2,
            max_expansions: maxExpansions,
            fuzzy_transpositions: true,
        },
    }
    if (negative.length === 0) return must

    return {
        bool: {
            must,
            must_not: negative.map((term) => ({multi_match: {query: term, fields: [...fields]}})),
        },
    }
}

/**
 * "Did you mean": a per-word term suggester against an unstemmed field. The
 * phrase suggester is not used — it fails on the `search_as_you_type` fields
 * these indexes carry.
 */
export function suggestBlock(q: string, field: string): Record<string, unknown> {
    const {positive} = splitTerms(q)
    return {
        text: positive,
        did_you_mean: {
            term: {field, suggest_mode: 'missing', min_word_length: 4, prefix_length: 2, size: 3},
        },
    }
}

export interface TypoPolicy {
    /** Rerun as fuzzy when the strict query returned fewer hits than this. */
    threshold: number
    maxExpansions: number
    /** Body timeout, so a slow fuzzy rerun returns partial results instead of hanging. */
    timeout: string
    /** Unstemmed field the term suggester reads. */
    suggestField: string
}

/**
 * Per-index policy, measured in hm_pipeline (export/queries.py's `TYPO`).
 * Works is the expensive one on the HDD VM, hence its tighter budget.
 */
export const TYPO_POLICY: Record<'projects' | 'organisations' | 'works', TypoPolicy> = {
    projects: {threshold: 5, maxExpansions: 20, timeout: '2s', suggestField: 'title'},
    organisations: {threshold: 5, maxExpansions: 20, timeout: '2s', suggestField: 'legalName'},
    works: {threshold: 3, maxExpansions: 20, timeout: '1500ms', suggestField: 'title'},
}

/** The `did_you_mean` options of a response's suggest block, in rank order, de-duplicated. */
export function readDidYouMean(suggest: unknown): string[] {
    const entries = (suggest as {did_you_mean?: Array<{options?: Array<{text?: string}>}>} | undefined)?.did_you_mean
    if (!Array.isArray(entries)) return []
    const texts = entries.flatMap((entry) => (entry.options ?? []).map((option) => option.text).filter((text): text is string => Boolean(text)))
    return [...new Set(texts)]
}
