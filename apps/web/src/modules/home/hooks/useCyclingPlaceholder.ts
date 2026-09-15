'use client'

import {useEffect, useState} from 'react'

const HOLD_MS = 2800
const TYPE_MS = 45
const DELETE_MS = 25
const SWITCH_PAUSE_MS = 300

type Phase = 'hold' | 'deleting' | 'typing'

/**
 * Cycles through `examples`, typing/deleting each one instead of swapping
 * instantly. Resets (no animation) whenever the `examples` list itself
 * changes — e.g. a different UseCase/SubUseCase was selected.
 */
export function useCyclingPlaceholder(examples: string[] | undefined): string {
    const [index, setIndex] = useState(0)
    const [text, setText] = useState(examples?.[0] ?? '')
    const [phase, setPhase] = useState<Phase>('hold')

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- resets to the first example when `examples` changes
        setIndex(0)
        setText(examples?.[0] ?? '')
        setPhase('hold')
    }, [examples])

    useEffect(() => {
        if (!examples || examples.length === 0) return

        if (phase === 'hold') {
            if (examples.length < 2) return
            const id = setTimeout(() => setPhase('deleting'), HOLD_MS)
            return () => clearTimeout(id)
        }

        if (phase === 'deleting') {
            if (text.length === 0) {
                const id = setTimeout(() => setPhase('typing'), SWITCH_PAUSE_MS)
                return () => clearTimeout(id)
            }
            const id = setTimeout(() => setText((prev) => prev.slice(0, -1)), DELETE_MS)
            return () => clearTimeout(id)
        }

        // phase === 'typing'
        const next = examples[(index + 1) % examples.length]
        if (text.length >= next.length) {
            const id = setTimeout(() => {
                setIndex((i) => (i + 1) % examples.length)
                setPhase('hold')
            }, SWITCH_PAUSE_MS)
            return () => clearTimeout(id)
        }
        const id = setTimeout(() => setText(next.slice(0, text.length + 1)), TYPE_MS)
        return () => clearTimeout(id)
    }, [phase, text, index, examples])

    return text
}
