import type {ComponentType} from 'react'
import {SearchEntityPanel} from './entity/SearchEntityPanel'
import {MinoritiesResultsPanel} from './minorities/MinoritiesResultsPanel'

// Keyed by UseCase.key — only UseCases with a real backend register here;
// everything else falls back to the generic empty-data SearchResultsPanel
// in UseCaseSearchPage. Deliberately not a field on UseCase itself
// (common/catalog/useCases.ts): that would make common/ import a
// feature-module component, inverting the dependency direction
// apps/web/RULES.md #3 describes (only import from your own or the common
// module — never the other way round). This registry stays inside
// modules/search/ instead, alongside the components it references.
export const RESULTS_PANEL_BY_USE_CASE: Partial<Record<string, ComponentType>> = {
    // Search is the one UseCase with several entities behind it, so its entry
    // is a router over `?e=` rather than a single panel (see SearchEntityPanel).
    search: SearchEntityPanel,
    minorities: MinoritiesResultsPanel,
}
