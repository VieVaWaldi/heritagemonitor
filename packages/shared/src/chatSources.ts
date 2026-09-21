import type {ExternalLink} from './links.js'

// Which of a document's links are worth handing to Lucy as fetchable sources,
// and in which order.
//
// This exists because of a measured failure, not a preference: the api
// allowlists her web_fetch tool by the HOSTNAME of the URLs a page published
// (see apps/api's llmchat.service.ts — that is the only granularity the tool
// offers). A doi.org link redirects to whichever publisher owns the record, so
// the host she actually lands on was never on the list and the fetch fails.
// Confirmed in testing: a direct `pdf_url` fetches, the same work's DOI link
// does not.
//
// So a redirecting link is never offered while a direct one exists. It stays
// fully visible in the UI — a human's browser follows the redirect perfectly
// well, and the DOI is the citable identifier.

/**
 * Hosts that resolve somewhere else rather than serving the thing. Only DOI
 * resolvers today; add a host here the moment another one turns out to
 * redirect off-allowlist.
 */
const REDIRECTING_HOSTS = new Set(['doi.org', 'dx.doi.org'])

/**
 * Preference among links that DO serve their own content, most useful to a
 * reader-of-text first: the full text, then the rich record page, then the
 * organisation's own site, then the aggregators and identifier registries.
 * A label not listed here sorts after the known ones but before anything
 * redirecting.
 */
const SOURCE_PRIORITY: Record<string, number> = {
    PDF: 0,
    CORDIS: 1,
    Page: 2,
    Website: 3,
    OpenAIRE: 4,
    ROR: 5,
    Wikidata: 6,
    Wikipedia: 7,
}

const UNRANKED = 50

function isRedirecting(link: ExternalLink): boolean {
    try {
        return REDIRECTING_HOSTS.has(new URL(link.url).hostname.toLowerCase())
    } catch {
        return false
    }
}

/**
 * The same links, ordered for fetching and with redirecting ones dropped —
 * unless they are all there is, in which case the best guess is better than
 * nothing and the link goes last.
 *
 * One helper for every entity: a work's PDF-before-DOI and a project's
 * CORDIS-before-DOI are the same rule, and having it in one place is what
 * stops the next entity from quietly reintroducing the broken case.
 */
export function fetchableSources(links: readonly ExternalLink[]): ExternalLink[] {
    const byPreference = [...links].sort(
        (a, b) => (SOURCE_PRIORITY[a.label] ?? UNRANKED) - (SOURCE_PRIORITY[b.label] ?? UNRANKED),
    )

    const direct = byPreference.filter((link) => !isRedirecting(link))
    return direct.length > 0 ? direct : byPreference
}

/** The single best source for a listed row, or null when it has none. */
export function bestFetchableSource(links: readonly ExternalLink[]): ExternalLink | null {
    return fetchableSources(links)[0] ?? null
}
