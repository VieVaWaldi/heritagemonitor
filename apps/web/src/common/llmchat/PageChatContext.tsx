'use client'

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
import type {PageContext} from './pageContext'

const EMPTY_CONTEXT: PageContext = {lines: [], sources: []}

interface PageChatContextValue {
    pageContext: PageContext
    setPageContext: (context: PageContext | null) => void
}

const PageChatContext = createContext<PageChatContextValue | null>(null)

// App-wide, same pattern as common/catalog/CorpusContext: mounted once in
// app/layout.tsx so it's available on every route. Holds a summary of
// "what's currently visible on screen" for Lucy to reference — content is
// entirely up to whichever producer publishes it (see
// usePageChatContextPublisher), this provider doesn't know or care what
// domain it's from.
/**
 * Two contexts with the same content are the same context. Compared by value,
 * not by identity, because this store sits at the root of the app: a producer
 * whose useMemo slips (one unmemoized object in its dependency list is enough)
 * would otherwise publish a new-but-identical context on every render, and
 * each publish re-renders the whole tree, which re-renders the producer —
 * an unbounded loop that takes the page down. Storing an equal value is a
 * no-op here, so the worst such a slip can cost is a wasted comparison.
 *
 * The content is small and bounded by design (see pageContext.ts: 20 rows per
 * section, 30 sources, 15,000 characters total).
 */
function sameContext(a: PageContext, b: PageContext): boolean {
    return (
        a.lazy?.key === b.lazy?.key &&
        a.lines.length === b.lines.length &&
        a.sources.length === b.sources.length &&
        a.lines.every((line, index) => line === b.lines[index]) &&
        a.sources.every((source, index) => source.url === b.sources[index].url && source.label === b.sources[index].label)
    )
}

export function PageChatContextProvider({children}: {children: ReactNode}) {
    const [pageContext, setPageContextState] = useState<PageContext>(EMPTY_CONTEXT)
    const setPageContext = useCallback(
        (next: PageContext | null) =>
            setPageContextState((current) => {
                const value = next ?? EMPTY_CONTEXT
                // Returning the CURRENT object makes React bail out of the
                // re-render entirely — see sameContext above.
                return sameContext(current, value) ? current : value
            }),
        [],
    )

    const value = useMemo(() => ({pageContext, setPageContext}), [pageContext, setPageContext])

    return <PageChatContext.Provider value={value}>{children}</PageChatContext.Provider>
}

function usePageChatContext(): PageChatContextValue {
    const context = useContext(PageChatContext)
    if (!context)
        throw new Error('usePageChatContext must be used within a PageChatContextProvider')
    return context
}

// Producer-facing: any results panel calls this with a fresh PageContext
// (see pageContext.ts's buildPageContext) whenever what it's showing
// changes, and it's cleared automatically on unmount. Same contract
// regardless of domain — MinoritiesResultsPanel is the first caller, any
// future /search/* UseCase's own results panel gets this for free with one
// call, no other wiring needed.
export function usePageChatContextPublisher(context: PageContext | null): void {
    const {setPageContext} = usePageChatContext()

    useEffect(() => {
        setPageContext(context)
    }, [context, setPageContext])

    // Clearing belongs to UNMOUNT only. Folding it into the effect above
    // would run it on every content change too (cleanup before re-run), so
    // each update would publish an empty context for one render — two
    // re-renders of the whole tree, and a blink of "Lucy knows nothing"
    // for anything reading the value at the wrong moment.
    useEffect(() => () => setPageContext(null), [setPageContext])
}

// Consumer-facing: a *stable* accessor for the current context, for the one
// consumer (LlmChatBox, via adapter.ts) that needs a fresh value read from
// inside a closure that's only constructed once per chat session. The ref
// is kept in sync via a plain (no-deps) effect that runs after every
// render — the same "ref updated after every render, read fresh from a
// stable callback" pattern DualSlider.tsx already uses for tickRef.
export function usePageChatContextReader(): () => PageContext {
    const {pageContext} = usePageChatContext()
    const ref = useRef(pageContext)
    useEffect(() => {
        ref.current = pageContext
    })
    return useCallback(() => ref.current, [])
}
