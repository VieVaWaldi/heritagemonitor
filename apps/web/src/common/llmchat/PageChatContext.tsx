'use client'

import {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from 'react'

interface PageChatContextValue {
    lines: string[]
    setLines: (lines: string[] | null) => void
}

const PageChatContext = createContext<PageChatContextValue | null>(null)

// App-wide, same pattern as common/catalog/CorpusContext: mounted once in
// app/layout.tsx so it's available on every route. Holds a summary of
// "what's currently visible on screen" for Lucy to reference — content is
// entirely up to whichever producer publishes it (see
// usePageChatContextPublisher), this provider doesn't know or care what
// domain it's from.
export function PageChatContextProvider({children}: {children: ReactNode}) {
    const [lines, setLinesState] = useState<string[]>([])
    const setLines = useCallback((next: string[] | null) => setLinesState(next ?? []), [])

    return <PageChatContext.Provider value={{lines, setLines}}>{children}</PageChatContext.Provider>
}

function usePageChatContext(): PageChatContextValue {
    const context = useContext(PageChatContext)
    if (!context) throw new Error('usePageChatContext must be used within a PageChatContextProvider')
    return context
}

// Producer-facing: any results panel calls this with a fresh compact
// summary of what it's currently showing (whenever that changes), and it's
// cleared automatically on unmount. Same contract regardless of domain —
// MinoritiesResultsPanel is the first caller, any future /search/*
// UseCase's own results panel gets this for free with one call, no other
// wiring needed.
export function usePageChatContextPublisher(lines: string[] | null): void {
    const {setLines} = usePageChatContext()
    useEffect(() => {
        setLines(lines)
        return () => setLines(null)
    }, [lines, setLines])
}

// Consumer-facing: a *stable* accessor for the current lines, for the one
// consumer (LlmChatBox, via adapter.ts) that needs a fresh value read from
// inside a closure that's only constructed once per chat session. The ref
// is kept in sync via a plain (no-deps) effect that runs after every
// render — the same "ref updated after every render, read fresh from a
// stable callback" pattern DualSlider.tsx already uses for tickRef.
export function usePageChatContextReader(): () => string[] {
    const {lines} = usePageChatContext()
    const ref = useRef(lines)
    useEffect(() => {
        ref.current = lines
    })
    return useCallback(() => ref.current, [])
}
