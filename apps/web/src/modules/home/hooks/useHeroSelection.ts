'use client'

import {useState} from 'react'
import {USE_CASES, type EntityKey, type CorpusKey} from '../data/useCases'

const DEFAULT_ENTITY: EntityKey = 'projects'
const DEFAULT_CORPUS: CorpusKey = 'dch'

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
    const [selectedCorpus, setSelectedCorpus] = useState<CorpusKey>(DEFAULT_CORPUS)

    const selectedUseCase = USE_CASES.find((useCase) => useCase.key === selectedUseCaseKey) ?? USE_CASES[0]
    const selectedSubUseCase = selectedUseCase.subUseCases?.find(
        (subUseCase) => subUseCase.key === selectedSubUseCaseKey,
    )
    const activeAction = selectedSubUseCase?.action ?? selectedUseCase.action
    const activeExamples = selectedSubUseCase?.examples ?? selectedUseCase.examples
    const selectedEntity = entityOverride ?? activeAction?.entity ?? DEFAULT_ENTITY

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
        selectedEntity,
        selectedCorpus,
        searchValue,
        selectUseCase,
        selectSubUseCase,
        setSearchValue,
        setSelectedEntity,
        setSelectedCorpus,
    }
}
