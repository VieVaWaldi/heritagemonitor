import type {ComponentType} from 'react'
import {AboutListButton} from './minorities/AboutListButton'

// Keyed by UseCase.key — the SearchNav slot right of ActionBar renders
// nothing for a UseCase not registered here. Same shape and same reasoning
// as resultsPanelRegistry.ts: stays inside modules/search/ so common/
// doesn't end up importing a feature-module component (apps/web/RULES.md #3).
export const ABOUT_TRIGGER_BY_USE_CASE: Partial<Record<string, ComponentType>> = {
    minorities: AboutListButton,
}
