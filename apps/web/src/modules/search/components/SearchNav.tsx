'use client'

import Box from '@mui/material/Box'
import {Navbar, ActionBar} from '@/common/components'
import {LlmChatNavToggle} from '@/common/llmchat/LlmChatNavToggle'
import {useCyclingPlaceholder} from '@/common/hooks/useCyclingPlaceholder'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {ABOUT_TRIGGER_BY_USE_CASE} from '../aboutTriggerRegistry'
import {useUseCaseSearch} from '../hooks/useUseCaseSearch'
import {searchNavLabels} from './searchNavModel'

export interface SearchNavProps {
    useCaseKey: string
    subUseCaseKey?: string
}

// The 'tall' Navbar carrying this route's search bar. Left to right, hugging
// the menu: a separator, the use case's icon and name in its own colour, on
// /search the selected entity's name (the trigger of the entity picker, which
// used to be a circle inside the bar), then the bar taking the rest. The
// corpus selector and Lucy stay on the right, as the Navbar always has them.
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
        onCompositionStart,
        onCompositionEnd,
    } = useUseCaseSearch(useCaseKey, subUseCaseKey)
    const placeholder = useCyclingPlaceholder(examples)
    const {useCaseName, entityName} = searchNavLabels(useCase, selectedEntity, entityOptions, subUseCase)
    const AboutTrigger = ABOUT_TRIGGER_BY_USE_CASE[useCaseKey]

    return (
        <Navbar size="tall" bordered sticky startDivider endAction={<LlmChatNavToggle />}>
            <Box sx={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: fluidUnit(1.5), minWidth: 0}}>
                {/* Icon and name: the icon always, the name where there is room —
                    on a narrow screen the bar keeps its width. */}
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, color: useCase.color}}>
                    <useCase.icon fontSize="medium" />
                    <Text variant="button" sx={{display: {xs: 'none', md: 'block'}, fontSize: '1.15rem', color: 'inherit', whiteSpace: 'nowrap'}}>
                        {useCaseName}
                    </Text>
                </Box>
                <Box sx={{flex: '1 1 0', minWidth: 0}}>
                    <ActionBar
                        searchValue={searchValue}
                        onSearchChange={setSearchValue}
                        onSearchSubmit={handleSearchSubmit}
                        placeholder={placeholder}
                        entityOptions={entityOptions}
                        selectedEntity={selectedEntity}
                        onEntityChange={setSelectedEntity}
                        // The entity picker sits LEFT of the bar, and only where the
                        // entity is a choice (/search); the other routes show none.
                        showEntitySelector={entitySelectorInteractive && entityName !== null}
                        entitySelectorInteractive={entitySelectorInteractive}
                        entitySelectorVariant="label"
                        entitySelectorPlacement="left"
                        suggestions={suggestions}
                        onSuggestionSelect={handleSuggestionSelect}
                        onCompositionStart={onCompositionStart}
                        onCompositionEnd={onCompositionEnd}
                    />
                </Box>
                {AboutTrigger && <AboutTrigger />}
            </Box>
        </Navbar>
    )
}
