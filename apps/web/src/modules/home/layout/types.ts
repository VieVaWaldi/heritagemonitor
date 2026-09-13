import type {ReactNode} from 'react'

// Shared slot contract for HeroDesktopLayout/HeroMobileLayout — HeroPage
// (container) builds these once and hands them to whichever layout the
// current breakpoint picks, so filling in the mobile layout later needs no
// change to HeroPage or this contract.
export interface HeroLayoutSlots {
    menu: ReactNode
    languageSelector: ReactNode
    title: ReactNode
    actionBar: ReactNode
    subtitle: ReactNode
    sourcesLine: ReactNode
    useCasesIntro: ReactNode
    useCaseBar: ReactNode
    useCaseContent: ReactNode
    footerCta: ReactNode
    scrollHint: ReactNode
}
