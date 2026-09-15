'use client'

import {useCallback, useState} from 'react'
import {useIntroTitle} from './useIntroTitle'
import {useTypedTitle} from './useTypedTitle'

const INTRO_FINAL_TEXT = 'Welcome to Heritage Monitor'

export interface HeroTitle {
    title: string
    /** true while the "Welcome to Heritage Monitor" intro is still showing,
     * ie before notifyUseCaseSelected() has been called. */
    isIntro: boolean
    notifyUseCaseSelected: () => void
}

/**
 * Drives the hero's title text. Plays the "Welcome to Heritage Monitor"
 * intro once on mount, then holds there — it does NOT auto-advance to the
 * selected UseCase's title. HeroPage calls notifyUseCaseSelected() from the
 * UseCaseBar's onSelect, and only then does the title switch over, via
 * useTypedTitle's existing delete/retype animation (the same one that
 * already runs when switching between UseCases) — so the intro -> real
 * title reveal reuses that animation rather than needing its own.
 */
export function useHeroTitle(useCaseTitle: string): HeroTitle {
    const introText = useIntroTitle()
    const [useCaseSelected, setUseCaseSelected] = useState(false)
    const typedTitle = useTypedTitle(useCaseSelected ? useCaseTitle : INTRO_FINAL_TEXT)

    const notifyUseCaseSelected = useCallback(() => setUseCaseSelected(true), [])

    return {
        title: useCaseSelected ? typedTitle : introText,
        isIntro: !useCaseSelected,
        notifyUseCaseSelected,
    }
}
