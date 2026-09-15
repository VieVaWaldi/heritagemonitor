'use client'

import {useEffect, useState} from 'react'

const WELCOME_PART = 'Welcome to '
const REST_PART = 'Heritage Monitor'
const FULL_TEXT = WELCOME_PART + REST_PART

const TYPE_WL = 15
const TYPE_HM = 45
const PAUSE_MS = 600

type Phase = 'typingWelcome' | 'pausing' | 'typingRest'

/**
 * One-shot mount animation: types "Welcome to ", pauses, then continues
 * typing "Heritage Monitor" (no delete step) and stays there — this hook
 * never changes the text again once fully typed. See useHeroTitle for how
 * the hand-off to the selected UseCase's title works.
 */
export function useIntroTitle(): string {
    const [text, setText] = useState('')
    const [phase, setPhase] = useState<Phase>('typingWelcome')

    useEffect(() => {
        if (phase === 'typingWelcome') {
            if (text.length >= WELCOME_PART.length) {
                const id = setTimeout(() => setPhase('pausing'), 0)
                return () => clearTimeout(id)
            }
            const id = setTimeout(() => setText(WELCOME_PART.slice(0, text.length + 1)), TYPE_WL)
            return () => clearTimeout(id)
        }

        if (phase === 'pausing') {
            const id = setTimeout(() => setPhase('typingRest'), PAUSE_MS)
            return () => clearTimeout(id)
        }

        // phase === 'typingRest'
        if (text.length >= FULL_TEXT.length) return undefined
        const id = setTimeout(() => setText(FULL_TEXT.slice(0, text.length + 1)), TYPE_HM)
        return () => clearTimeout(id)
    }, [phase, text])

    return text
}
