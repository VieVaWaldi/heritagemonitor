import type {SelectorOption} from '@/common/components/EntitySelector'
import ScienceIcon from '@mui/icons-material/Science'
import DescriptionIcon from '@mui/icons-material/Description'
import ApartmentIcon from '@mui/icons-material/Apartment'
import PaidIcon from '@mui/icons-material/Paid'

// Shared with UseCase actions (./useCases) and /search (result entity + query param).

export type EntityKey =
    | 'projects'
    | 'works'
    | 'organisations'
    | 'minorities'
    | 'experts'
    | 'grants'
    | 'topics'
    | 'organisationNetwork'
    | 'queryNetwork'

export type EntityOption = SelectorOption<EntityKey>

// The only entities /search actually supports. Other UseCases don't have a
// real, user-picked entity — see UseCase#hasEntitySelector in ./useCases.
export const ENTITIES: EntityOption[] = [
    {key: 'projects', label: 'Projects', icon: ScienceIcon, color: 'primary.light'},
    {key: 'works', label: 'Works', icon: DescriptionIcon, color: 'primary.main'},
    {key: 'organisations', label: 'Organisations', icon: ApartmentIcon, color: 'primary.dark'},
    {key: 'grants', label: 'Grants', icon: PaidIcon, color: 'secondary.dark'},
]
