'use client'

import type {EntitySuggestion} from '@heritagemonitor/shared'
import type {CompositionEventHandler} from 'react'
import Box from '@mui/material/Box'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {SearchBar} from './SearchBar'
import {EntitySelector, type SelectorOption} from './EntitySelector'

export interface ActionBarProps<EntityKey extends string = string> {
    searchValue: string
    onSearchChange: (value: string) => void
    /** Left undefined until there's a destination page to submit to. Accepts
     * an explicit query so the clear button can submit '' without waiting
     * on onSearchChange's state update to land first. */
    onSearchSubmit?: (query?: string) => void
    placeholder?: string
    entityOptions: SelectorOption<EntityKey>[]
    selectedEntity: EntityKey
    onEntityChange: (key: EntityKey) => void
    /** False renders the circle as a static icon with no hover panel — e.g.
     * when entityOptions is a single non-pickable stand-in. Defaults true. */
    entitySelectorInteractive?: boolean
    /** Forwarded straight to the inner SearchBar — see its own docs. Omit
     * for a plain bar with no autocomplete dropdown. */
    suggestions?: EntitySuggestion[]
    onSuggestionSelect?: (suggestion: EntitySuggestion) => void
    /**
     * IME composition (Japanese, Chinese, accented input). Forwarded to the
     * input so half-composed text is never written to the URL — see
     * common/url's useUrlQueryDraft.
     */
    onCompositionStart?: CompositionEventHandler<HTMLElement>
    onCompositionEnd?: CompositionEventHandler<HTMLElement>
    /**
     * False leaves the entity picker out of the bar: /search puts it to the
     * LEFT of the bar instead (see modules/search SearchNav), and the other
     * search routes have nothing to pick. The hero page keeps the default.
     */
    showEntitySelector?: boolean
    /**
     * `label` uses the EntitySelector's text variant (the entity's name with a
     * dropdown arrow, see EntitySelector) instead of the circle — the /search
     * navbar and the landing page's Search use case. Only applies while the
     * selector is interactive: a use case with nothing to pick keeps its
     * static circle icon on the right.
     */
    entitySelectorVariant?: 'circle' | 'label'
    /**
     * Which side of the bar the `label` variant sits on: `left` (the /search
     * navbar, after the use case's name) or `right` (the landing page, where
     * the circle used to be). The circle always sits on the right.
     */
    entitySelectorPlacement?: 'left' | 'right'
}

// SearchBar (a full pill) plus a circular icon-only EntitySelector floating
// just to its right, the same height as the bar. Corpus selection used to be
// a third segment here — it now lives in the shared Navbar's CorpusPanel
// instead.
export function ActionBar<EntityKey extends string = string>({
    searchValue,
    onSearchChange,
    onSearchSubmit,
    placeholder,
    entityOptions,
    selectedEntity,
    onEntityChange,
    entitySelectorInteractive = true,
    suggestions,
    onSuggestionSelect,
    onCompositionStart,
    onCompositionEnd,
    showEntitySelector = true,
    entitySelectorVariant = 'circle',
    entitySelectorPlacement = 'right',
}: ActionBarProps<EntityKey>) {
    const useLabel = entitySelectorVariant === 'label' && entitySelectorInteractive
    const labelOnLeft = useLabel && entitySelectorPlacement === 'left'
    const selector = showEntitySelector ? (
        <EntitySelector
            options={entityOptions}
            value={selectedEntity}
            onChange={onEntityChange}
            interactive={entitySelectorInteractive}
            variant={useLabel ? 'label' : 'circle'}
            panelAlign={labelOnLeft ? 'start' : 'end'}
        />
    ) : null

    return (
        <Box sx={{display: 'flex', alignItems: 'stretch', gap: fluidUnit(1), width: '100%'}}>
            {labelOnLeft && selector}
            <Box sx={{flex: 1, minWidth: 0}}>
                <SearchBar
                    value={searchValue}
                    onSearch={onSearchChange}
                    onClear={() => {
                        onSearchChange('')
                        onSearchSubmit?.('')
                    }}
                    onSearchStart={(key) => key === 'Enter' && onSearchSubmit?.()}
                    placeholder={placeholder}
                    roundedCorners="all"
                    suggestions={suggestions}
                    onSuggestionSelect={onSuggestionSelect}
                    onCompositionStart={onCompositionStart}
                    onCompositionEnd={onCompositionEnd}
                />
            </Box>
            {!labelOnLeft && selector}
        </Box>
    )
}
