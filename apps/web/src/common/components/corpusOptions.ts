import CastleIcon from '@mui/icons-material/Castle'
import BiotechIcon from '@mui/icons-material/Biotech'
import type {IconComponent} from './EntitySelector'

export type CorpusKey = 'science' | 'dch'

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
