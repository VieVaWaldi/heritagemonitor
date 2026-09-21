// What the search pages' navbar labels say, decided from the route's use case.
// Pure and free of React and `@/` aliases so it can be unit-tested (see
// test/searchNavModel.test.ts).

export interface NavUseCase {
    name: string
    /** True for the one use case (Search) that lets the visitor pick the entity. */
    hasEntitySelector?: boolean
}

export interface NavEntityOption {
    key: string
    label: string
}

/**
 * The two labels left of the search bar.
 *
 * The name is the sub-use-case's when the route has one — 'Network of your
 * organisations' and 'Network of a query' are the two collaboration pages, and
 * 'Visualise Collaborations' would not say which one this is — else the use
 * case's own. The entity name appears only where the entity is a choice
 * (`/search`); everywhere else the entity is fixed by the route and naming it
 * would be noise.
 */
export function searchNavLabels(
    useCase: NavUseCase,
    selectedEntity: string,
    entityOptions: readonly NavEntityOption[],
    subUseCase?: {name: string} | null,
): {useCaseName: string; entityName: string | null} {
    return {
        useCaseName: subUseCase?.name ?? useCase.name,
        entityName: useCase.hasEntitySelector ? (entityOptions.find((option) => option.key === selectedEntity)?.label ?? null) : null,
    }
}
