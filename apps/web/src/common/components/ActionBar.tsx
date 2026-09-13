'use client'

import Box from '@mui/material/Box'
import {SearchBar} from './SearchBar'
import {EntitySelector, type SelectorOption} from './EntitySelector'
import {CorpusSelector, type CorpusOption} from './CorpusSelector'

export interface ActionBarProps<EntityKey extends string = string, CorpusKey extends string = string> {
    searchValue: string
    onSearchChange: (value: string) => void
    /** Left undefined until there's a destination page to submit to. */
    onSearchSubmit?: () => void
    placeholder?: string
    entityOptions: SelectorOption<EntityKey>[]
    selectedEntity: EntityKey
    onEntityChange: (key: EntityKey) => void
    corpusOptions: CorpusOption<CorpusKey>[]
    selectedCorpus: CorpusKey
    onCorpusChange: (key: CorpusKey) => void
}

// The 3-part configurable search bar: SearchBar (pill on the left) + EntitySelector
// (square) + CorpusSelector (pill on the right), with a gap between each so the
// whole bar reads as one pill-shaped control split into separate segments.
export function ActionBar<EntityKey extends string = string, CorpusKey extends string = string>({
    searchValue,
    onSearchChange,
    onSearchSubmit,
    placeholder,
    entityOptions,
    selectedEntity,
    onEntityChange,
    corpusOptions,
    selectedCorpus,
    onCorpusChange,
}: ActionBarProps<EntityKey, CorpusKey>) {
    return (
        <Box sx={{display: 'flex', alignItems: 'stretch', gap: 2, width: '100%'}}>
            <Box sx={{flex: 1, minWidth: 0}}>
                <SearchBar
                    value={searchValue}
                    onSearch={onSearchChange}
                    onClear={() => onSearchChange('')}
                    onSearchStart={(key) => key === 'Enter' && onSearchSubmit?.()}
                    placeholder={placeholder}
                    roundedCorners="start"
                />
            </Box>
            <EntitySelector options={entityOptions} value={selectedEntity} onChange={onEntityChange} />
            <CorpusSelector options={corpusOptions} value={selectedCorpus} onChange={onCorpusChange} />
        </Box>
    )
}
