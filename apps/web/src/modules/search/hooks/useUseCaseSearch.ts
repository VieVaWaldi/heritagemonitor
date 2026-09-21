'use client'

import type {EntitySuggestion} from '@heritagemonitor/shared'
import {useCallback} from 'react'
import {ENTITIES, USE_CASES, type EntityKey, type EntityOption} from '@/common/catalog'
import {useEntitySuggestions} from '@/common/hooks/useEntitySuggestions'
import {SEARCH_PARAM, useUrlEntity, useUrlQueryDraft} from '@/common/url'

const DEFAULT_ENTITY: EntityKey = 'projects'

/**
 * Business logic behind a /search page's own ActionBar — the single-UseCase
 * counterpart to home's useHeroSelection. Unlike the hero, the UseCase (and
 * SubUseCase) here is fixed by the route rather than picked in the UI, and
 * submitting re-runs the search on the same page instead of navigating away.
 *
 * No state lives here any more. The query text and the entity are read from
 * and written to the URL through common/url (useUrlQueryDraft owns the
 * typing-vs-submit history policy, useUrlEntity owns `e`), and the corpus is
 * bound to the URL by the route's CorpusUrlBinding instead of the two-way
 * effect this hook used to carry. What is left is the mapping from the
 * UseCase catalog to the props the ActionBar wants.
 */
export function useUseCaseSearch(useCaseKey: string, subUseCaseKey?: string) {
    const {draft, setDraft, submit, onCompositionStart, onCompositionEnd} = useUrlQueryDraft()
    const {entity: urlEntity, setEntity} = useUrlEntity()

    const useCase = USE_CASES.find((candidate) => candidate.key === useCaseKey) ?? USE_CASES[0]
    const subUseCase = useCase.subUseCases?.find((candidate) => candidate.key === subUseCaseKey)
    const action = subUseCase?.action ?? useCase.action
    const examples = subUseCase?.examples ?? useCase.examples

    // Only Search lets the user actually pick an entity — see
    // UseCase#hasEntitySelector in common/catalog/useCases.ts. Every other
    // route has one fixed entity, so `e` in its URL means nothing there.
    const entitySelectorInteractive = useCase.hasEntitySelector ?? false
    const selectedEntity = entitySelectorInteractive ? urlEntity : (action?.entity ?? DEFAULT_ENTITY)

    const entityOptions: EntityOption[] = entitySelectorInteractive
        ? ENTITIES
        : [{key: selectedEntity, label: useCase.name, icon: useCase.icon, color: useCase.color}]

    // Which entity has a type-ahead is a capability of that entity's api, not
    // a flag on the use case — see useEntitySuggestions.
    const suggestions = useEntitySuggestions(selectedEntity, draft)

    // Picking a suggestion submits its text AND opens that exact document
    // when the suggestion carries an id, in one update so the new `sel`
    // survives the query change (see useUrlState's selection rules).
    const handleSuggestionSelect = useCallback(
        (suggestion: EntitySuggestion) =>
            submit(suggestion.label, suggestion.id ? {[SEARCH_PARAM.selection]: suggestion.id} : undefined),
        [submit],
    )

    return {
        useCase,
        subUseCase,
        examples,
        searchValue: draft,
        setSearchValue: setDraft,
        selectedEntity,
        setSelectedEntity: setEntity,
        entityOptions,
        entitySelectorInteractive,
        handleSearchSubmit: submit,
        suggestions,
        handleSuggestionSelect,
        onCompositionStart,
        onCompositionEnd,
    }
}
