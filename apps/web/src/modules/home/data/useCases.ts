import type {IconComponent} from '@/common/components'
import type {EntityKey} from '@/common/catalog'
import SearchIcon from '@mui/icons-material/Search'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import HubIcon from '@mui/icons-material/Hub'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'

export interface UseCaseAction {
    entity: EntityKey
    route?: string
}

export interface SubUseCase {
    key: string
    name: string
    examples?: string[]
    action: UseCaseAction
}

export interface UseCase {
    key: string
    icon: IconComponent
    /** sx-style theme color path, e.g. "secondary.main". */
    color: string
    name: string
    title: string
    description: string
    examples?: string[]
    /** Absent when the UseCase delegates to subUseCases (e.g. Collaboration) */
    action?: UseCaseAction
    subUseCases?: SubUseCase[]
    /** Only set when subUseCases is set — which one is selected by default */
    defaultSubUseCaseKey?: string
    tip?: string
    /**
     * Whether the ActionBar's circle is a real, hoverable entity picker
     * (options: ENTITIES) rather than a static icon showing this UseCase's
     * own `icon`/`color`. Only Search lets the user pick which entity to
     * search — the other UseCases (and Collaboration's subUseCases, which
     * point at different entities under the hood) always show one fixed
     * icon for the whole UseCase.
     */
    hasEntitySelector?: boolean
}

export const USE_CASES: UseCase[] = [
    {
        key: 'search',
        icon: SearchIcon,
        color: 'primary.light',
        name: 'Search',
        title: 'Search, download & AI chat',
        description:
            'Search across projects, works and organisations all linked together from the biggest data providers. Use AI to summarize the results or fetch PDFs. ... ',
        examples: ['digicher', 'conservation', 'BIM', 'photogrammetry AND heritage preservation -consumer'],
        action: {
            entity: 'projects',
            route: '/search',
        },
        hasEntitySelector: true,
        tip: 'You can talk to LucAi about the results on the next page',
    },
    {
        key: 'findExperts',
        icon: WorkspacePremiumIcon,
        color: 'secondary.light',
        name: 'Find Experts',
        title: 'Find someone to help you',
        description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        examples: ['3D scanning specialist', 'heritage conservation architect', 'digitisation consultant'],
        action: {
            entity: 'experts',
            route: '/search/experts',
        },
        tip: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
        key: 'minorities',
        icon: PeopleAltIcon,
        color: 'secondary.main',
        name: 'Map Minorities',
        title: 'Map research by minorities',
        description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        examples: ['Roma heritage', 'indigenous knowledge systems', 'minority language archives'],
        action: {
            entity: 'minorities',
            route: '/search/minorities',
        },
        tip: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
        key: 'funding',
        icon: AccountBalanceIcon,
        color: 'secondary.dark',
        name: 'Track Funding',
        title: 'Map research by funding',
        description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        examples: ['Horizon Europe heritage grant', 'national conservation fund', 'UNESCO heritage grant'],
        action: {
            entity: 'grants',
            route: '/search/funding',
        },
        tip: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
        key: 'collaboration',
        icon: HubIcon,
        color: 'warning.dark',
        name: 'Visualise Collaborations',
        title: 'Map who works with whom',
        description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        defaultSubUseCaseKey: 'organisationNetwork',
        subUseCases: [
            {
                key: 'organisationNetwork',
                name: 'Network of your organisations',
                examples: ['FSU Jena', 'Vilniaus Tech University'],
                action: {
                    entity: 'organisations',
                    route: '/search/collaboration/organisationNetwork',
                },
            },
            {
                key: 'queryNetwork',
                name: 'Network of a query',
                examples: ['Leiden University'],
                action: {
                    entity: 'projects',
                    route: '/search/collaboration/queryNetwork',
                },
            },
        ],
    },
]
