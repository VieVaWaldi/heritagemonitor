'use client'

import {useState} from 'react'
import {ACTION_BAR_ENTITIES, USE_CASES, type EntityKey, type EntityOption} from '@/common/catalog'

const DEFAULT_ENTITY: EntityKey = 'projects'

// Business logic behind the Hero page's UseCase picker + ActionBar, kept out
// of the JSX per apps/web/RULES.md #7.
export function useHeroSelection() {
    const [selectedUseCaseKey, setSelectedUseCaseKey] = useState<string>(USE_CASES[0].key)
    const [selectedSubUseCaseKey, setSelectedSubUseCaseKey] = useState<string | undefined>(
        USE_CASES.find((useCase) => useCase.subUseCases)?.defaultSubUseCaseKey,
    )
    // Manually picking an entity in the ActionBar overrides whatever the
    // selected UseCase/SubUseCase implies, until a new UseCase is picked.
    const [entityOverride, setEntityOverride] = useState<EntityKey | null>(null)
    const [searchValue, setSearchValue] = useState('')

    const selectedUseCase = USE_CASES.find((useCase) => useCase.key === selectedUseCaseKey) ?? USE_CASES[0]
    const selectedSubUseCase = selectedUseCase.subUseCases?.find(
        (subUseCase) => subUseCase.key === selectedSubUseCaseKey,
    )
    const activeAction = selectedSubUseCase?.action ?? selectedUseCase.action
    const activeExamples = selectedSubUseCase?.examples ?? selectedUseCase.examples
    const selectedEntity = entityOverride ?? activeAction?.entity ?? DEFAULT_ENTITY
    // Destination path for the search submit — every UseCase/SubUseCase
    // action currently defines one (see common/catalog/useCases.ts).
    const activeRoute = activeAction?.route
    // What picking a suggestion does there (default: restrict the list to it).
    const suggestionFocus = activeAction?.suggestionFocus

    // Only Search lets the user actually pick an entity (ACTION_BAR_ENTITIES).
    // Every other UseCase shows one fixed, non-interactive icon — its own —
    // no matter which entity its (sub)UseCase action targets under the hood.
    const entitySelectorInteractive = selectedUseCase.hasEntitySelector ?? false
    const entityOptions: EntityOption[] = entitySelectorInteractive
        ? ACTION_BAR_ENTITIES
        : [
              {
                  key: selectedEntity,
                  label: selectedUseCase.name,
                  icon: selectedUseCase.icon,
                  color: selectedUseCase.color,
              },
          ]

    function selectUseCase(key: string) {
        setSelectedUseCaseKey(key)
        const useCase = USE_CASES.find((candidate) => candidate.key === key)
        setSelectedSubUseCaseKey(useCase?.defaultSubUseCaseKey)
        setEntityOverride(null)
    }

    function selectSubUseCase(key: string) {
        setSelectedSubUseCaseKey(key)
        setEntityOverride(null)
    }

    function setSelectedEntity(key: EntityKey) {
        setEntityOverride(key)
    }

    return {
        useCases: USE_CASES,
        selectedUseCase,
        selectedSubUseCase,
        activeExamples,
        activeRoute,
        suggestionFocus,
        selectedEntity,
        entityOptions,
        entitySelectorInteractive,
        searchValue,
        selectUseCase,
        selectSubUseCase,
        setSearchValue,
        setSelectedEntity,
    }
}
