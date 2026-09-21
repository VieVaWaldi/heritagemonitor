'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react'
import {DEFAULT_CORPUS, type CorpusKey} from './corpus'

/**
 * A two-way binding between this context and a route's URL, published by a
 * component living on that route (see modules/search's CorpusUrlBinding).
 *
 * Why a binding rather than the provider reading the URL itself: this
 * provider is mounted in the root layout, and calling `useSearchParams()`
 * there would opt every page in the app out of static rendering. The one
 * route where the corpus belongs in the URL (`/search*`) publishes its own
 * binding from inside a Suspense boundary, and the provider defers to it
 * while it is mounted. Same publisher/reader shape as PageChatContext.
 */
export interface CorpusUrlBinding {
    corpus: CorpusKey
    setCorpus: (key: CorpusKey) => void
}

interface CorpusContextValue {
    selectedCorpus: CorpusKey
    setSelectedCorpus: (key: CorpusKey) => void
    setUrlBinding: (binding: CorpusUrlBinding | null) => void
}

const CorpusContext = createContext<CorpusContextValue | null>(null)

// App-wide: the CorpusPanel (in the shared Navbar, on every route) writes here.
export function CorpusProvider({children}: {children: ReactNode}) {
    // The fallback for routes that have no URL state of their own (the hero
    // page), and the value a /search link built from there carries over.
    const [sessionCorpus, setSessionCorpus] = useState<CorpusKey>(DEFAULT_CORPUS)
    const [urlBinding, setUrlBinding] = useState<CorpusUrlBinding | null>(null)

    const selectedCorpus = urlBinding?.corpus ?? sessionCorpus

    const setSelectedCorpus = useCallback(
        (key: CorpusKey) => {
            // Both, always: the session value keeps the choice when the user
            // leaves /search, the binding puts it in the URL while they are there.
            setSessionCorpus(key)
            urlBinding?.setCorpus(key)
        },
        [urlBinding],
    )

    const value = useMemo(
        () => ({selectedCorpus, setSelectedCorpus, setUrlBinding}),
        [selectedCorpus, setSelectedCorpus],
    )

    return <CorpusContext.Provider value={value}>{children}</CorpusContext.Provider>
}

export function useCorpus(): CorpusContextValue {
    const context = useContext(CorpusContext)
    if (!context) throw new Error('useCorpus must be used within a CorpusProvider')
    return context
}

/**
 * Producer-facing: a route hands the context its URL binding for as long as
 * it is mounted, and takes it back on unmount — so leaving /search falls back
 * to the session value instead of a stale URL reader.
 */
export function useCorpusUrlBindingPublisher(binding: CorpusUrlBinding): void {
    const {setUrlBinding} = useCorpus()
    useEffect(() => {
        setUrlBinding(binding)
        return () => setUrlBinding(null)
    }, [binding, setUrlBinding])
}

// Stable accessor for the current selection, same "ref updated after every
// render, read fresh from a stable callback" pattern as
// PageChatContext.tsx's usePageChatContextReader — for the one consumer
// (LlmChatBox, via adapter.ts) that needs a fresh value from inside a
// closure constructed once per chat session.
export function useSelectedCorpusReader(): () => CorpusKey {
    const {selectedCorpus} = useCorpus()
    const ref = useRef(selectedCorpus)
    useEffect(() => {
        ref.current = selectedCorpus
    })
    return useCallback(() => ref.current, [])
}
