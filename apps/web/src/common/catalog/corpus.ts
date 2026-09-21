import CastleIcon from '@mui/icons-material/Castle'
import BiotechIcon from '@mui/icons-material/Biotech'
import {DEFAULT_CORPUS as SHARED_DEFAULT_CORPUS, type Corpus} from '@heritagemonitor/shared'
import type {IconComponent} from '@/common/components/EntitySelector'

// The keys are wire vocabulary (the api's `?c=` param and its zod enum), so
// they come from the shared contract instead of being declared a second time
// here. This file adds only what the UI needs on top: label, icon, color.
export type CorpusKey = Corpus

export interface CorpusOption {
    key: CorpusKey
    /** Shorthand shown in the collapsed CorpusPanel, e.g. "DCH". */
    label: string
    /** Shown per-row once CorpusPanel expands, e.g. "Digital Cultural Heritage". */
    fullName: string
    icon: IconComponent
    color: string
}

export const CORPUSES: CorpusOption[] = [
    {
        key: 'science',
        label: 'SCI',
        fullName: 'Science',
        icon: BiotechIcon,
        color: 'primary.main',
    },
    {
        key: 'dch',
        label: 'DCH',
        fullName: 'Digital Cultural Heritage',
        icon: CastleIcon,
        color: 'secondary.main',
    },
]

export const DEFAULT_CORPUS: CorpusKey = SHARED_DEFAULT_CORPUS
