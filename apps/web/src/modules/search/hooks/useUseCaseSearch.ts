'use client'

import {useEffect, useState} from 'react'
import {useRouter, useSearchParams} from 'next/navigation'
import {
    CORPUSES,
    ENTITIES,
    USE_CASES,
    useCorpus,
    type CorpusKey,
    type EntityKey,
    type EntityOption,
} from '@/common/catalog'
import {buildSearchUrl, SEARCH_PARAM} from '@/common/url'

const DEFAULT_ENTITY: EntityKey = 'projects'

/**
 * Business logic behind a /search page's own ActionBar — the single-UseCase
 * counterpart to home's useHeroSelection. Unlike the hero, the UseCase (and
 * SubUseCase) here is fixed by the route rather than picked in the UI, and
 * submitting re-runs the search on the same page instead of navigating away
 * to it. Kept out of the JSX per apps/web/RULES.md #7.
 *
 * The URL is the source of truth for `q`/`e`/`c`: the ActionBar hydrates from
 * them on load (so a shared link or a reload reproduces the exact search
 * that produced these results, not an empty bar / the session's default
 * corpus) and re-syncs if they change underneath it (router.push to this
 * same route doesn't remount it). `e` is only ever read back for Search
 * itself — every other UseCase has one fixed entity, so its value in the URL
 * is irrelevant here regardless of what it says. `c` is the one exception
 * that isn't local state: it lives in CorpusContext (shared with every other
 * route, see common/catalog/CorpusContext), so this hook syncs it both ways
 * instead of owning it.
 */
export function useUseCaseSearch(useCaseKey: string, subUseCaseKey?: string) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const {selectedCorpus, setSelectedCorpus} = useCorpus()

    const useCase = USE_CASES.find((candidate) => candidate.key === useCaseKey) ?? USE_CASES[0]
    const subUseCase = useCase.subUseCases?.find((candidate) => candidate.key === subUseCaseKey)
    const action = subUseCase?.action ?? useCase.action
    const examples = subUseCase?.examples ?? useCase.examples

    // Only Search lets the user actually pick an entity — see
    // UseCase#hasEntitySelector in common/catalog/useCases.ts.
    const entitySelectorInteractive = useCase.hasEntitySelector ?? false

    const urlQuery = searchParams.get(SEARCH_PARAM.query) ?? ''
    const urlEntity = searchParams.get(SEARCH_PARAM.entity) as EntityKey | null
    const urlEntityIsUsable = entitySelectorInteractive && ENTITIES.some((option) => option.key === urlEntity)
    const urlCorpus = searchParams.get(SEARCH_PARAM.corpus) as CorpusKey | null
    const urlCorpusIsUsable = urlCorpus !== null && CORPUSES.some((option) => option.key === urlCorpus)

    const [searchValue, setSearchValue] = useState(urlQuery)
    const [entityOverride, setEntityOverride] = useState<EntityKey | null>(urlEntityIsUsable ? urlEntity : null)

    // Re-sync `searchValue`/`entityOverride` from the URL when it changes
    // underneath us (permalink, back/forward) — adjusted during render
    // instead of an effect, per
    // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
    const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery)
    if (urlQuery !== prevUrlQuery) {
        setPrevUrlQuery(urlQuery)
        setSearchValue(urlQuery)
    }
    const [prevUrlEntity, setPrevUrlEntity] = useState(urlEntityIsUsable ? urlEntity : null)
    if (urlEntityIsUsable && urlEntity !== prevUrlEntity) {
        setPrevUrlEntity(urlEntity)
        setEntityOverride(urlEntity)
    }

    const selectedEntity = entityOverride ?? action?.entity ?? DEFAULT_ENTITY
    const entityOptions: EntityOption[] = entitySelectorInteractive
        ? ENTITIES
        : [{key: selectedEntity, label: useCase.name, icon: useCase.icon, color: useCase.color}]

    function pushSearchUrl(overrides: {query?: string; entity?: EntityKey; corpus?: CorpusKey}) {
        if (!action?.route) return
        router.push(
            buildSearchUrl({
                route: action.route,
                query: overrides.query ?? searchValue,
                entity: overrides.entity ?? selectedEntity,
                corpus: overrides.corpus ?? selectedCorpus,
            }),
        )
    }

    function handleSearchSubmit() {
        pushSearchUrl({})
    }

    // Switching entity starts a new search — the previous query doesn't
    // necessarily mean anything for the newly selected entity, so it's
    // cleared along with it instead of carried over.
    function handleEntityChange(key: EntityKey) {
        setEntityOverride(key)
        setSearchValue('')
        pushSearchUrl({entity: key, query: ''})
    }

    // Corpus lives in CorpusContext (shared with every other route), not
    // local state, so syncing it can't be "adjusted during render" the way
    // searchValue/entityOverride are above — setSelectedCorpus targets a
    // different component's (CorpusProvider's) state, and mutating that
    // during this component's render is unsafe. Both directions genuinely
    // belong in an effect:
    //   - URL has a valid, different corpus (permalink, mount, back/forward)
    //     → it wins: adopt it into the context.
    //   - otherwise, the context differs from the URL for some other reason
    //     (CorpusPanel, in the shared Navbar, was used) → reflect it in the
    //     URL. router.replace, not push: a background sync, not a new search
    //     the user should be able to back-button away from.
    // The `return` after the first branch is what keeps these from fighting
    // on the same render — only one direction ever acts per mismatch.
    useEffect(() => {
        if (urlCorpusIsUsable && urlCorpus !== selectedCorpus) {
            setSelectedCorpus(urlCorpus)
            return
        }
        if (action?.route && selectedCorpus !== urlCorpus) {
            router.replace(
                buildSearchUrl({route: action.route, query: urlQuery, entity: selectedEntity, corpus: selectedCorpus}),
            )
        }
    }, [urlCorpusIsUsable, urlCorpus, selectedCorpus, setSelectedCorpus, action?.route, router, urlQuery, selectedEntity])

    return {
        useCase,
        subUseCase,
        examples,
        searchValue,
        setSearchValue,
        selectedEntity,
        setSelectedEntity: handleEntityChange,
        entityOptions,
        entitySelectorInteractive,
        handleSearchSubmit,
    }
}
