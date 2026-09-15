import type {ReactNode} from 'react'

// Slot contract for HeroLayout — HeroPage (container) builds these once and
// hands them to the layout, keeping content/wiring separate from placement.
export interface HeroLayoutSlots {
    title: ReactNode
    actionBar: ReactNode
    subtitle: ReactNode
    sourcesLine: ReactNode
    useCasesIntro: ReactNode
    useCaseSection: ReactNode
    footerCta: ReactNode
    logoBanner: ReactNode
}
