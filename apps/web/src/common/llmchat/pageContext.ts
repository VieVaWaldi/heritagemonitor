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

/**
 * Context that is too big or too rarely needed to publish eagerly, fetched at
 * chat-send time instead — see resolvePageContext. The producer builds `load`
 * from plain request descriptions, so equal `key`s mean equal behaviour and the
 * store can compare contexts by key without looking at the function.
 */
export interface PageContextLazy {
    /** Identifies WHAT would be loaded (the requests, filters included). */
    key: string
    load: (signal: AbortSignal) => Promise<{sections: PageContextSection[]; sources: PageContextSource[]}>
}

export interface PageContext {
    lines: string[]
    sources: PageContextSource[]
    /** Optional extra fetched only when the user actually sends a message. */
    lazy?: PageContextLazy
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
 * Hard ceiling for one context, whatever the sections ask for: 20 list rows,
 * one 5,000-character detail and the selected entity's related lists (fetched
 * lazily, see resolvePageContext) fit comfortably, and nothing can grow past
 * this and eat the model's window (the api trims the conversation, not the
 * context, so an oversized context would push out the chat history instead).
 * Lines are dropped from the TAIL, so the state heading, the list and then
 * the selected entity's detail survive in that order.
 */
const MAX_TOTAL_CHARS = 26_000

/**
 * How many URLs Lucy is offered. Much higher than openrouter's web_fetch
 * `max_uses` (20, see apps/api's openrouter.client.ts) on purpose: fetching
 * is capped, offering is not — she should be able to pick the right 20 out of
 * everything on the page (list rows AND the selected entity's related lists),
 * and an unfetched URL is still a link she can name.
 */
export const MAX_SOURCES = 60

/** How many URLs Lucy can actually FETCH per answer — told to her in the related-lists preface. */
export const MAX_FETCHES = 20

function capRow(row: string, maxChars: number): string {
    return row.length > maxChars ? `${row.slice(0, maxChars - 1)}…` : row
}

function sectionLines(section: PageContextSection): string[] {
    return [
        section.heading,
        ...section.rows
            .slice(0, MAX_ROWS_PER_SECTION)
            .map((row) => capRow(row, section.maxCharsPerRow ?? MAX_CHARS_PER_ROW)),
    ]
}

/** Trims lines from the tail to the character budget. */
function fitBudget(lines: string[]): string[] {
    const fitted = [...lines]
    let total = fitted.reduce((sum, line) => sum + line.length, 0)
    let dropped = 0
    while (total > MAX_TOTAL_CHARS && fitted.length > 1) {
        total -= fitted.pop()!.length
        dropped += 1
    }
    if (dropped > 0) fitted.push(`(${dropped} further line(s) omitted to stay within the context budget.)`)
    return fitted
}

function dedupeSources(sources: PageContextSource[]): PageContextSource[] {
    const seen = new Set<string>()
    return sources
        .filter((source) => (seen.has(source.url) ? false : (seen.add(source.url), true)))
        .slice(0, MAX_SOURCES)
}

/**
 * The context as it goes on the wire: the published one plus whatever its
 * `lazy` part loads, merged under the same budget and source cap. A failed or
 * slow load costs only the extra — the message is sent with what was already
 * published, never blocked on it.
 */
export async function resolvePageContext(context: PageContext, signal?: AbortSignal): Promise<PageContext> {
    const {lazy, ...eager} = context
    if (!lazy) return eager

    let extra: Awaited<ReturnType<PageContextLazy['load']>> | null = null
    try {
        extra = await lazy.load(signal ?? new AbortController().signal)
    } catch {
        extra = null
    }
    if (!extra) return eager

    return {
        lines: fitBudget([...eager.lines, ...extra.sections.flatMap(sectionLines)]),
        sources: dedupeSources([...eager.sources, ...extra.sources]),
    }
}

export function buildPageContext(options: {
    sections: PageContextSection[]
    sources?: PageContextSource[]
    lazy?: PageContextLazy
}): PageContext {
    const lines = options.sections.flatMap(sectionLines)

    return {
        lines: fitBudget(lines),
        sources: (options.sources ?? []).slice(0, MAX_SOURCES),
        ...(options.lazy ? {lazy: options.lazy} : {}),
    }
}
