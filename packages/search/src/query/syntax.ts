// Google-like free text -> OpenSearch `simple_query_string`. Port of
// hm_pipeline's export/queries.py (`rewrite_query` / `sqs`), which is the
// reference implementation these rules were measured against; the parity
// cases in ../../test/syntax.test.ts pin the behaviour to it.
//
// PYTHON -> JS REGEX GOTCHA: Python's `\b` and `\w` are Unicode-aware, JS's
// are ASCII-only, so a literal port would treat "Ärchäologie AND x" as having
// a word boundary where Python does not. Every boundary below is therefore
// written as an explicit `\p{L}\p{N}_` look-around with the `u` flag.

const WORD = '\\p{L}\\p{N}_'
const NOT_PREFIX = new RegExp(`(?<![${WORD}])NOT\\s+`, 'gu')
const AND_OPERATOR = new RegExp(`(?<![${WORD}])AND(?![${WORD}])`, 'gu')
const OR_OPERATOR = new RegExp(`(?<![${WORD}])OR(?![${WORD}])`, 'gu')
// `~N` (fuzzy/slop): with the FUZZY/SLOP flags off, `word~2` would silently
// become `word AND 2`, so it is stripped rather than passed through.
const FUZZY_SUFFIX = /~\d*/gu

// simple_query_string flags. Deliberately NOT enabled: PREFIX(*), FUZZY(~N),
// SLOP("..."~N), NEAR — no wildcard/fuzzy cost, no leading-wildcard blowups.
export const SQS_FLAGS = 'AND|OR|NOT|PHRASE|PRECEDENCE|ESCAPE|WHITESPACE'

/**
 * Rewrites what a user types into `simple_query_string` syntax:
 * `NOT x` -> `-x`, `a AND b` -> `a + b`, `a OR b` -> `a | b`.
 *
 * Segments inside `"..."` are left untouched; an unbalanced trailing quote is
 * dropped (it would otherwise turn the whole rest of the input into one
 * phrase); dangling operators at either end are removed.
 */
export function rewriteQuery(input: string): string {
    let q = input.trim()

    const quoteCount = (q.match(/"/gu) ?? []).length
    if (quoteCount % 2 === 1) {
        const last = q.lastIndexOf('"')
        q = q.slice(0, last) + q.slice(last + 1)
    }

    // The capture group makes String.split keep the quoted segments, exactly
    // like Python's re.split with a capturing pattern.
    const rewritten = q
        .split(/("[^"]*")/u)
        .map((part) => {
            if (part.startsWith('"') && part.endsWith('"') && part.length >= 2) return part
            return part.replace(FUZZY_SUFFIX, '').replace(NOT_PREFIX, '-').replace(AND_OPERATOR, '+').replace(OR_OPERATOR, '|')
        })
        .join('')

    return rewritten
        .replace(/^\s*[+|]\s*/u, '')
        .replace(/\s*[+|-]\s*$/u, '')
        .replace(/\s+/gu, ' ')
        .trim()
}

// Type aliases, not interfaces: an interface has no implicit index signature,
// so it would not be assignable to the `Record<string, unknown>` body type the
// query builders compose these into.
export type SimpleQueryStringClause = {
    simple_query_string: {
        query: string
        fields: string[]
        default_operator: 'AND'
        flags: string
        lenient: true
        analyze_wildcard: false
    }
}

export type MatchAllClause = {
    match_all: Record<string, never>
}

/** The text clause for a query, or `match_all` when nothing searchable is left. */
export function sqs(q: string, fields: readonly string[]): SimpleQueryStringClause | MatchAllClause {
    const query = rewriteQuery(q)
    if (!query) return {match_all: {}}
    return {
        simple_query_string: {
            query,
            fields: [...fields],
            default_operator: 'AND',
            flags: SQS_FLAGS,
            lenient: true,
            analyze_wildcard: false,
        },
    }
}

// Field boosts per index, measured in hm_pipeline (export/queries.py). Kept
// next to `sqs` because they are part of the same decision: what "a text
// query" means for each entity.
export const PROJECT_FIELDS = ['acronym^5', 'title^3', 'summary', 'keywords', 'grantId', 'org_names^0.5'] as const
export const WORK_FIELDS = ['title^3', 'authors', 'container_name^0.5'] as const
export const ORG_FIELDS = ['legalName^3', 'legalShortName^2', 'alternativeNames'] as const
export const GRANT_FIELDS = ['description', 'id'] as const
