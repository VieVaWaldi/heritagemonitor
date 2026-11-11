'use client'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import {alpha} from '@mui/material/styles'
import Diversity2Icon from '@mui/icons-material/Diversity2'
import {ActionBar, CorpusMenuList, HMMenu, MenuSection, Navbar} from '@/common/components'
import {useLlmChatToggle} from '@/common/llmchat/LlmChatRuntime'
import {LlmChatNavToggle} from '@/common/llmchat/LlmChatNavToggle'
import {useCyclingPlaceholder} from '@/common/hooks/useCyclingPlaceholder'
import {useIsMobile} from '@/common/hooks/useIsMobile'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {ABOUT_TRIGGER_BY_USE_CASE} from '../aboutTriggerRegistry'
import {useUseCaseSearch} from '../hooks/useUseCaseSearch'
import {searchNavLabels} from './searchNavModel'

export interface SearchNavProps {
    useCaseKey: string
    subUseCaseKey?: string
}

const MENU_ROW_HEIGHT = 44

// Same row grammar as CorpusMenuList's own rows, for HMMenu's mobile-only
// "Lucy" section — opens Lucy's panel and, unlike Settings/Corpus (which stay
// open so they can keep being fiddled with), closes this menu: the two are
// both side panels, and leaving both open at once reads as broken chrome
// rather than two screens stacked on purpose.
function LucyMenuRow({onOpened}: {onOpened: () => void}) {
    const {toggle} = useLlmChatToggle()
    return (
        <ButtonBase
            onClick={() => {
                toggle()
                onOpened()
            }}
            sx={(theme) => ({
                width: '100%',
                height: MENU_ROW_HEIGHT,
                justifyContent: 'flex-start',
                gap: 1.25,
                px: 1.5,
                borderRadius: '8px',
                color: 'text.primary',
                '&:hover': {backgroundColor: alpha(theme.palette.text.primary, 0.05)},
            })}
        >
            <Diversity2Icon fontSize="small" sx={{color: 'primary.main'}} />
            <Text variant="body1" sx={{flex: 1, textAlign: 'left'}}>
                Ask Lucy
            </Text>
        </ButtonBase>
    )
}

// The 'tall' Navbar carrying this route's search bar. Left to right, hugging
// the menu: a separator, the use case's icon and name in its own colour, on
// /search the selected entity's name (the trigger of the entity picker, which
// used to be a circle inside the bar), then the bar taking the rest. The
// corpus selector and Lucy stay on the right, as the Navbar always has them —
// except on mobile, where there is no room for either: both move into
// HMMenu's own menu (trigger="fab" there, a floating circle instead of hugging
// the bar), between Settings and Explore.
export function SearchNav({useCaseKey, subUseCaseKey}: SearchNavProps) {
    const isMobile = useIsMobile()
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

    const actionBar = (
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
    )

    if (isMobile) {
        return (
            <Navbar
                size="tall"
                bordered
                sticky
                startDivider
                hideCorpus
                menuSlot={
                    <HMMenu
                        trigger="fab"
                        extraSections={(close) => (
                            <>
                                <MenuSection heading="Corpus">
                                    <CorpusMenuList />
                                </MenuSection>

                                <Divider />

                                <MenuSection heading="Lucy">
                                    <LucyMenuRow onOpened={close} />
                                </MenuSection>
                            </>
                        )}
                    />
                }
            >
                {/* No use-case icon/name, no AboutTrigger here — the search
                    bar needs all the width this bar has to give. */}
                <Box sx={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', minWidth: 0}}>{actionBar}</Box>
            </Navbar>
        )
    }

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
                <Box sx={{flex: '1 1 0', minWidth: 0}}>{actionBar}</Box>
                {AboutTrigger && <AboutTrigger />}
            </Box>
        </Navbar>
    )
}
