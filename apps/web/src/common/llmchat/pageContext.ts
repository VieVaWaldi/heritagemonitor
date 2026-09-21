// Shared shape every results panel uses to hand Lucy a bounded summary of
// what's currently on screen — one call site instead of each panel hand-
// rolling its own array-building. This enforces structure/size only: how many
// rows, how long a row can be, how many source URLs. It deliberately does NOT
// decide which fields are safe to expose — only the panel that owns a data
// domain knows that, so each panel's own row-summarizer function stays
// responsible for picking safe fields (see summarizeProjectRow for the pattern).

export interface PageContextSection {
    /** e.g. "Projects currently open (page 2 of 500, 10,000+ match)". */
    heading: string
    /** One entry per row, already formatted (e.g. "- ODYCCEUS: Opinion Dynamics ..."). */
    rows: string[]
    /**
     * Overrides MAX_CHARS_PER_ROW for this section. A list row stays short
     * (one line per result, 20 of them); the selected entity's detail is a
     * single row carrying every field the overview shows, so it gets a much
     * larger allowance — see SELECTED_ENTITY_CHARS.
     */
    maxCharsPerRow?: number
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

// Keeps a section's contribution roughly constant regardless of how big the
// underlying list is — mirrors PaginatedList's own page size (20).
const MAX_ROWS_PER_SECTION = 20

// Default for list rows: one result per line, cut rather than allowed to run.
const MAX_CHARS_PER_ROW = 300

/**
 * The allowance a panel passes as `maxCharsPerRow` for its selected entity's
 * detail section: everything the overview tab shows (a project summary alone
 * runs to a couple of thousand characters) in one row.
 */
export const SELECTED_ENTITY_CHARS = 5_000

/**
 * Hard ceiling for one context, whatever the sections ask for: 20 list rows
 * plus one 5,000-character detail fits comfortably, and nothing can grow past
 * this and eat the model's window (the api trims the conversation, not the
 * context, so an oversized context would push out the chat history instead).
 * Lines are dropped from the TAIL, so the state heading, the list and then
 * the selected entity's detail survive in that order.
 */
const MAX_TOTAL_CHARS = 15_000

/**
 * How many URLs Lucy is offered. Higher than openrouter's web_fetch
 * `max_uses` (20, see apps/api's openrouter.client.ts) on purpose: fetching
 * is capped, offering is not — she should be able to pick the right 20 out of
 * everything on the page, and an unfetched URL is still a link she can name.
 */
const MAX_SOURCES = 30

function capRow(row: string, maxChars: number): string {
    return row.length > maxChars ? `${row.slice(0, maxChars - 1)}…` : row
}

export function buildPageContext(options: {
    sections: PageContextSection[]
    sources?: PageContextSource[]
}): PageContext {
    const lines = options.sections.flatMap((section) => [
        section.heading,
        ...section.rows
            .slice(0, MAX_ROWS_PER_SECTION)
            .map((row) => capRow(row, section.maxCharsPerRow ?? MAX_CHARS_PER_ROW)),
    ])

    let total = lines.reduce((sum, line) => sum + line.length, 0)
    let dropped = 0
    while (total > MAX_TOTAL_CHARS && lines.length > 1) {
        total -= lines.pop()!.length
        dropped += 1
    }
    if (dropped > 0) lines.push(`(${dropped} further line(s) omitted to stay within the context budget.)`)

    return {
        lines,
        sources: (options.sources ?? []).slice(0, MAX_SOURCES),
    }
}
