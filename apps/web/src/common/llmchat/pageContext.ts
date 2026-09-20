// Shared shape every results panel uses to hand Lucy a bounded summary of
// what's currently on screen — one call site instead of each panel hand-
// rolling its own array-building (see MinoritiesResultsPanel for the first
// caller). This enforces structure/size only: how many rows, how long a
// row can be, how many source URLs. It deliberately does NOT decide which
// fields are safe to expose — only the panel that owns a data domain knows
// that, so each panel's own row-summarizer function stays responsible for
// picking safe fields (see summarizeMinorityRow for the pattern).

export interface PageContextSection {
    /** e.g. "Minorities results currently open (page 2 of 5, ~140 groups match)". */
    heading: string
    /** One entry per row, already formatted (e.g. "- Roma (Ethnic group, ...)"). */
    rows: string[]
}

export interface PageContextSource {
    /** Shown to Lucy so she can refer to the link by name instead of the raw URL. */
    label: string
    url: string
}

export interface PageContext {
    lines: string[]
    sources: PageContextSource[]
}

// Keeps a single section's contribution roughly constant regardless of how
// big the underlying list is — mirrors PaginatedList's own page size (20).
const MAX_ROWS_PER_SECTION = 20
// A row that runs long (e.g. a stringified list of countries) gets cut
// rather than silently blowing the token budget for the whole section.
const MAX_CHARS_PER_ROW = 300
// Matches openrouter.client.ts's web_fetch `max_uses: 20` — no point
// publishing more approved sources than Lucy could ever fetch in one turn.
const MAX_SOURCES = 20

function capRow(row: string): string {
    return row.length > MAX_CHARS_PER_ROW ? `${row.slice(0, MAX_CHARS_PER_ROW - 1)}…` : row
}

export function buildPageContext(options: {
    sections: PageContextSection[]
    sources?: PageContextSource[]
}): PageContext {
    const lines = options.sections.flatMap((section) => [
        section.heading,
        ...section.rows.slice(0, MAX_ROWS_PER_SECTION).map(capRow),
    ])
    return {
        lines,
        sources: (options.sources ?? []).slice(0, MAX_SOURCES),
    }
}
