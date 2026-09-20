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

interface CorpusContextValue {
    selectedCorpus: CorpusKey
    setSelectedCorpus: (key: CorpusKey) => void
}

const CorpusContext = createContext<CorpusContextValue | null>(null)

// App-wide: the CorpusPanel (in the shared Navbar, on every route) writes here search submit
export function CorpusProvider({children}: {children: ReactNode}) {
    const [selectedCorpus, setSelectedCorpus] = useState<CorpusKey>(DEFAULT_CORPUS)
    const value = useMemo(() => ({selectedCorpus, setSelectedCorpus}), [selectedCorpus])

    return <CorpusContext.Provider value={value}>{children}</CorpusContext.Provider>
}

export function useCorpus(): CorpusContextValue {
    const context = useContext(CorpusContext)
    if (!context) throw new Error('useCorpus must be used within a CorpusProvider')
    return context
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
