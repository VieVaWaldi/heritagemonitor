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

// The only entities /search actually supports
export const ENTITIES: EntityOption[] = [
    {key: 'projects', label: 'Projects', icon: ScienceIcon, color: 'primary.light'},
    {key: 'works', label: 'Works', icon: DescriptionIcon, color: 'primary.main'},
    {key: 'organisations', label: 'Organisations', icon: ApartmentIcon, color: 'primary.dark'},
    {key: 'grants', label: 'Grants', icon: PaidIcon, color: 'secondary.dark'},
]

// A shade per entity, all from DIGICHer's orange family — Projects sits at
// the exact brand color (see Footer.tsx's STROKE_COLOR for the same hex),
// the others fanned out from it in hue/lightness so the set still reads as
// one family. Literal hex, not theme color paths, same reasoning as
// Footer.tsx's palette: this is DIGICHer's identity, not HM's, so it stays
// fixed across light/dark mode.
//
// Used only where the ActionBar's entity picker is an actual choice (see
// useUseCaseSearch/useHeroSelection's entitySelectorInteractive branch) —
// on /search and the hero's own Search use case. ENTITIES itself stays
// untouched: MenuUseCaseList and UseCaseContentBar key off its colors for
// unrelated per-sub-use-case icon coding, not entity selection.
const ACTION_BAR_ENTITY_COLOR: Partial<Record<EntityKey, string>> = {
    projects: '#FF8117',
    works: '#E04706',
    organisations: '#FAA338',
    grants: '#E9A60C',
}

export const ACTION_BAR_ENTITIES: EntityOption[] = ENTITIES.map((entity) => ({
    ...entity,
    color: ACTION_BAR_ENTITY_COLOR[entity.key] ?? entity.color,
}))
