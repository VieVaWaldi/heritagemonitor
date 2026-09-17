'use client'

import {createContext, useContext, useMemo, useState, type ReactNode} from 'react'
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
