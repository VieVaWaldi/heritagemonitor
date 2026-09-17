'use client'

import Box from '@mui/material/Box'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {SearchBar} from './SearchBar'
import {EntitySelector, type SelectorOption} from './EntitySelector'

export interface ActionBarProps<EntityKey extends string = string> {
    searchValue: string
    onSearchChange: (value: string) => void
    /** Left undefined until there's a destination page to submit to. */
    onSearchSubmit?: () => void
    placeholder?: string
    entityOptions: SelectorOption<EntityKey>[]
    selectedEntity: EntityKey
    onEntityChange: (key: EntityKey) => void
    /** False renders the circle as a static icon with no hover panel — e.g.
     * when entityOptions is a single non-pickable stand-in. Defaults true. */
    entitySelectorInteractive?: boolean
    /** Forwarded straight to the inner SearchBar — see its own docs. Omit
     * for a plain bar with no autocomplete dropdown. */
    suggestions?: string[]
    onSuggestionSelect?: (value: string) => void
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
}: ActionBarProps<EntityKey>) {
    return (
        <Box sx={{display: 'flex', alignItems: 'stretch', gap: fluidUnit(1), width: '100%'}}>
            <Box sx={{flex: 1, minWidth: 0}}>
                <SearchBar
                    value={searchValue}
                    onSearch={onSearchChange}
                    onClear={() => onSearchChange('')}
                    onSearchStart={(key) => key === 'Enter' && onSearchSubmit?.()}
                    placeholder={placeholder}
                    roundedCorners="all"
                    suggestions={suggestions}
                    onSuggestionSelect={onSuggestionSelect}
                />
            </Box>
            <EntitySelector
                options={entityOptions}
                value={selectedEntity}
                onChange={onEntityChange}
                interactive={entitySelectorInteractive}
            />
        </Box>
    )
}
