// How a link inside one of Lucy's replies should behave. Lucy answers with
// lists of heritagemonitor URLs that the user treats as a table of contents
// across use cases, and with outbound links (DOI, CORDIS, publisher PDFs) —
// and the two need opposite handling:
//
// - an INTERNAL link must navigate this tab through the client router, so the
//   single chat instance in the root layout (see LlmChatRuntime) survives and
//   the conversation is still there on the next page;
// - an EXTERNAL link must open a NEW tab, so leaving for doi.org does not
//   throw that conversation away.
//
// Pure and DOM-free so the rule itself is unit-tested rather than inferred
// from clicking around.

export type ChatLinkTarget =
    | {kind: 'internal'; href: string}
    | {kind: 'external'; href: string}
    /** Nothing to navigate: a bare fragment, mailto:, tel:, or an unparseable href. */
    | {kind: 'ignore'}

/** Schemes that are navigations we take over. Anything else is left to the browser. */
const NAVIGABLE_PROTOCOLS = new Set(['http:', 'https:'])

export function classifyChatLink(href: string | null | undefined, origin: string): ChatLinkTarget {
    const raw = href?.trim()
    if (!raw) return {kind: 'ignore'}
    // A pure fragment scrolls within the current page; hijacking it would
    // push a pointless history entry.
    if (raw.startsWith('#')) return {kind: 'ignore'}

    let url: URL
    try {
        url = new URL(raw, origin)
    } catch {
        return {kind: 'ignore'}
    }

    if (!NAVIGABLE_PROTOCOLS.has(url.protocol)) return {kind: 'ignore'}

    if (url.origin === origin) {
        // Router-relative: path + query + hash, never the absolute URL, so
        // next/navigation treats it as an in-app route.
        return {kind: 'internal', href: `${url.pathname}${url.search}${url.hash}`}
    }

    return {kind: 'external', href: url.toString()}
}
