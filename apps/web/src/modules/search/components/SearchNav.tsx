'use client'

import Box from '@mui/material/Box'
import {Navbar, ActionBar} from '@/common/components'
import {useCyclingPlaceholder} from '@/common/hooks/useCyclingPlaceholder'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {useUseCaseSearch} from '../hooks/useUseCaseSearch'

export interface SearchNavProps {
    useCaseKey: string
    subUseCaseKey?: string
}

// The 'tall' Navbar variant carrying this route's ActionBar, configured the
// same way the same UseCase/SubUseCase shows it on the HeroPage.
export function SearchNav({useCaseKey, subUseCaseKey}: SearchNavProps) {
    const {
        examples,
        searchValue,
        setSearchValue,
        selectedEntity,
        setSelectedEntity,
        entityOptions,
        entitySelectorInteractive,
        handleSearchSubmit,
    } = useUseCaseSearch(useCaseKey, subUseCaseKey)
    const placeholder = useCyclingPlaceholder(examples)

    return (
        <Navbar size="tall" bordered sticky>
            {/* Capped, and right-anchored with a guaranteed gap (rather than
                mx: 'auto', which centers but gives back none of that margin
                once the flex space gets tight) — the middle slot spans
                HMMenu-to-CorpusPanel, far wider than a search pill should
                stretch, and butts up right against CorpusPanel without it. */}
            <Box sx={{width: '100%', maxWidth: 720, ml: 'auto', mr: fluidUnit(2)}}>
                <ActionBar
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    onSearchSubmit={handleSearchSubmit}
                    placeholder={placeholder}
                    entityOptions={entityOptions}
                    selectedEntity={selectedEntity}
                    onEntityChange={setSelectedEntity}
                    entitySelectorInteractive={entitySelectorInteractive}
                />
            </Box>
        </Navbar>
    )
}
