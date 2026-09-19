'use client'

import Box from '@mui/material/Box'
import {Navbar, ActionBar} from '@/common/components'
import {LlmChatNavToggle} from '@/common/llmchat/LlmChatNavToggle'
import {useCyclingPlaceholder} from '@/common/hooks/useCyclingPlaceholder'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {ABOUT_TRIGGER_BY_USE_CASE} from '../aboutTriggerRegistry'
import {useUseCaseSearch} from '../hooks/useUseCaseSearch'

export interface SearchNavProps {
    useCaseKey: string
    subUseCaseKey?: string
}

// The 'tall' Navbar variant carrying this route's ActionBar, configured the
// same way the same UseCase/SubUseCase shows it on the HeroPage.
export function SearchNav({useCaseKey, subUseCaseKey}: SearchNavProps) {
    const {
        useCase,
        subUseCase,
        examples,
        searchValue,
        setSearchValue,
        selectedEntity,
        setSelectedEntity,
        entityOptions,
        entitySelectorInteractive,
        handleSearchSubmit,
        suggestions,
        handleSuggestionSelect,
    } = useUseCaseSearch(useCaseKey, subUseCaseKey)
    const placeholder = useCyclingPlaceholder(examples)
    const useCaseName = subUseCase?.name ?? useCase.name
    const AboutTrigger = ABOUT_TRIGGER_BY_USE_CASE[useCaseKey]

    return (
        <Navbar size="tall" bordered sticky endAction={<LlmChatNavToggle />}>
            {/* Grid, not flex + margin: two equal 1fr tracks either side of the
                capped ActionBar track center it within the middle slot
                regardless of the label's width — margin/auto tricks only center
                within whatever's left after a fixed offset, which drifts once
                CorpusPanel/endAction's own width changes. */}
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 720px) minmax(0, 1fr)',
                    alignItems: 'center',
                    columnGap: fluidUnit(1),
                }}
            >
                <Text
                    variant="button"
                    sx={{
                        color: 'text.disabled',
                        fontSize: '1.15rem',
                        textAlign: 'right',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {useCaseName}
                </Text>
                <ActionBar
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    onSearchSubmit={handleSearchSubmit}
                    placeholder={placeholder}
                    entityOptions={entityOptions}
                    selectedEntity={selectedEntity}
                    onEntityChange={setSelectedEntity}
                    entitySelectorInteractive={entitySelectorInteractive}
                    suggestions={suggestions}
                    onSuggestionSelect={handleSuggestionSelect}
                />
                {/* Centered in this track, not hugging the ActionBar — the track
                    itself already spans from the ActionBar's edge to the
                    Navbar's own right-hand content (CorpusPanel/endAction, both
                    outside this grid), so centering here reads as "evenly
                    between" the two. */}
                <Box sx={{display: 'flex', justifyContent: 'center'}}>{AboutTrigger && <AboutTrigger />}</Box>
            </Box>
        </Navbar>
    )
}
