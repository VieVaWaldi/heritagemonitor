import type {IconComponent} from '@/common/components'
import type {EntityKey} from './entities'
import SearchIcon from '@mui/icons-material/Search'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import HubIcon from '@mui/icons-material/Hub'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'

export interface UseCaseAction {
    entity: EntityKey
    route?: string
    /**
     * What picking an autocomplete suggestion does on this route. Default
     * `only`: the list is restricted to that one document. `center`: the
     * document becomes the centre of the organisation network. `query`: the
     * suggestion's text is searched (the query network is a text search).
     */
    suggestionFocus?: 'only' | 'center' | 'query'
}

export interface SubUseCase {
    key: string
    name: string
    examples?: string[]
    action: UseCaseAction
    /** See UseCase#hasResultsPanel. */
    hasResultsPanel?: boolean
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
    /**
     * Whether UseCaseSearchPage renders the results list + tabbed detail
     * panel (SearchResultsPanel) for this UseCase, instead of the "coming
     * soon" placeholder. Left unset for Collaboration's subUseCases since
     * their right-hand side will likely be a graph/map widget instead of
     * tabs, not this same panel — undecided until that's built.
     */
    hasResultsPanel?: boolean
}

export const USE_CASES: UseCase[] = [
    {
        key: 'search',
        icon: SearchIcon,
        color: 'primary.light',
        name: 'Search',
        title: 'Search, download & AI chat',
        description:
            'Search 3.9M projects, 50M works, 494K organisations and their funding streams, all linked to each other. Filter by topic, funder, programme, region and year, then open any result to see everything connected to it.',
        examples: ['digicher', 'conservation', 'BIM', 'photogrammetry AND heritage preservation -consumer'],
        action: {
            entity: 'projects',
            route: '/search',
        },
        hasEntitySelector: true,
        hasResultsPanel: true,
        tip: 'You can talk to LucAi about the results on the next page',
    },
    {
        key: 'findExperts',
        icon: WorkspacePremiumIcon,
        color: 'secondary.light',
        name: 'Find Experts',
        title: 'Find someone to help you',
        description:
            'Find the organisations that have actually done the most work on your subject, ranked by how many matching projects they ran. Open one to see those projects, its works and how much funding reached it.',
        examples: ['3D scanning specialist', 'heritage conservation architect', 'digitisation consultant'],
        action: {
            entity: 'experts',
            route: '/search/experts',
        },
        hasResultsPanel: true,
        tip: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
        key: 'minorities',
        icon: PeopleAltIcon,
        color: 'secondary.main',
        name: 'Map Communities',
        title: 'Map research by communities',
        description:
            'Browse indigenous, ethno-religious, linguistic and other communities to see which projects, works, organisations and research topics are about them. Filter by country, language, religion or topic to find who is studying a community and what they have produced.',
        examples: ['Roma heritage', 'indigenous knowledge systems', 'minority language archives'],
        action: {
            entity: 'minorities',
            route: '/search/minorities',
        },
        hasResultsPanel: true,
        tip: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
        key: 'funding',
        icon: AccountBalanceIcon,
        color: 'secondary.dark',
        name: 'Track Funding',
        title: 'Map research by funding',
        description:
            'See where research money actually lands on a map of the best-funded organisations for your search. Explore the funding streams behind it and narrow everything to one programme, country or institution type.',
        examples: ['Horizon Europe heritage grant', 'national conservation fund', 'UNESCO heritage grant'],
        action: {
            entity: 'grants',
            route: '/search/funding',
        },
        hasResultsPanel: true,
        tip: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
        key: 'collaboration',
        icon: HubIcon,
        color: 'warning.dark',
        name: 'Visualise Collaborations',
        title: 'Map who works with whom',
        description:
            'Draw the network of who works with whom, as arcs between organisations that shared a project. Centre it on one institution or on a whole query to see which partnerships a research area is built on.',
        defaultSubUseCaseKey: 'organisationNetwork',
        subUseCases: [
            {
                key: 'organisationNetwork',
                name: 'Network of your organisations',
                examples: ['FSU Jena', 'Vilniaus Tech University'],
                action: {
                    entity: 'organisations',
                    route: '/search/collaboration/organisationNetwork',
                    suggestionFocus: 'center',
                },
                hasResultsPanel: true,
            },
            {
                key: 'queryNetwork',
                name: 'Network of a query',
                examples: ['digital archaeology', 'virtual reality heritage'],
                action: {
                    entity: 'projects',
                    route: '/search/collaboration/queryNetwork',
                    suggestionFocus: 'query',
                },
                hasResultsPanel: true,
            },
        ],
    },
]
