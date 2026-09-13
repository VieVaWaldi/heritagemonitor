'use client'

import {useEffect, useState} from 'react'

const TYPE_MS = 5
const DELETE_MS = 3
const SWITCH_PAUSE_MS = 12

type Phase = 'idle' | 'deleting' | 'typing'

/**
 * Types `target` in with the same delete/retype animation as
 * useCyclingPlaceholder, but only on change — no mount animation, no cycling.
 */
export function useTypedTitle(target: string): string {
    const [text, setText] = useState(target)
    const [previousTarget, setPreviousTarget] = useState(target)
    const [phase, setPhase] = useState<Phase>('idle')

    useEffect(() => {
        if (target === previousTarget) return
        // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the delete/retype animation when `target` changes
        setPreviousTarget(target)
        setPhase('deleting')
    }, [target, previousTarget])

    useEffect(() => {
        if (phase === 'idle') return

        if (phase === 'deleting') {
            if (text.length === 0) {
                const id = setTimeout(() => setPhase('typing'), SWITCH_PAUSE_MS)
                return () => clearTimeout(id)
            }
            const id = setTimeout(() => setText((prev) => prev.slice(0, -1)), DELETE_MS)
            return () => clearTimeout(id)
        }

        // phase === 'typing'
        if (text.length >= target.length) {
            const id = setTimeout(() => setPhase('idle'), 0)
            return () => clearTimeout(id)
        }
        const id = setTimeout(() => setText(target.slice(0, text.length + 1)), TYPE_MS)
        return () => clearTimeout(id)
    }, [phase, text, target])

    return text
}
