'use client'

import {useTranslations} from 'next-intl'
import {useRouter} from 'next/navigation'
import Link from '@mui/material/Link'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {ActionBar} from '@/common/components'
import {useCorpus} from '@/common/catalog'
import {buildSearchUrl} from '@/common/url'
import {useCyclingPlaceholder} from '@/common/hooks/useCyclingPlaceholder'
import type {EntitySuggestion} from '@heritagemonitor/shared'
import {useEntitySuggestions} from '@/common/hooks/useEntitySuggestions'
import {useHeroSelection} from './hooks/useHeroSelection'
import {useHeroTitle} from './hooks/useHeroTitle'
import {UseCaseSection} from './components/UseCaseSection'
import {LogoBanner} from './components/LogoBanner'
import {HeroLayout} from './layout/HeroLayout'
import type {HeroLayoutSlots} from './layout/types'

// Container: owns state/wiring and builds the slots. No breakpoint-specific
// markup lives here — that's HeroLayout's job
export function HeroPage() {
    const t = useTranslations('Home')
    const router = useRouter()

    const {
        useCases,
        selectedUseCase,
        selectedSubUseCase,
        activeExamples,
        activeRoute,
        selectedEntity,
        entityOptions,
        entitySelectorInteractive,
        searchValue,
        selectUseCase,
        selectSubUseCase,
        setSearchValue,
        setSelectedEntity,
    } = useHeroSelection()
    const {selectedCorpus} = useCorpus()

    const placeholder = useCyclingPlaceholder(activeExamples)
    const {title: heroTitle, isIntro, notifyUseCaseSelected} = useHeroTitle(selectedUseCase.title)
    const suggestions = useEntitySuggestions(selectedEntity, searchValue)

    // Accepts an explicit query so a suggestion click can submit the value
    // it just picked without waiting on setSearchValue's state update to
    // land first (React state isn't synchronous — reading `searchValue`
    // from the closure here would still see the pre-click value).
    function handleSearchSubmit(query?: string, selection?: string) {
        if (!activeRoute) return
        router.push(
            buildSearchUrl({
                route: activeRoute,
                query: query ?? searchValue,
                entity: selectedEntity,
                corpus: selectedCorpus,
                selection,
            }),
        )
    }

    // A suggestion that carries an id lands on the results page with that
    // document already open, rather than on a text search for its name.
    function handleSuggestionSelect(suggestion: EntitySuggestion) {
        setSearchValue(suggestion.label)
        handleSearchSubmit(suggestion.label, suggestion.id)
    }

    const slots: HeroLayoutSlots = {
        title: (
            <Text
                variant={isIntro ? 'h3' : 'h4'}
                component="h1"
                sx={{fontSize: isIntro ? fluidUnit(2.75) : fluidUnit(2)}}
            >
                {heroTitle || ' '}
            </Text>
        ),
        actionBar: (
            <ActionBar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                onSearchSubmit={handleSearchSubmit}
                placeholder={placeholder}
                entityOptions={entityOptions}
                entitySelectorInteractive={entitySelectorInteractive}
                selectedEntity={selectedEntity}
                onEntityChange={setSelectedEntity}
                suggestions={suggestions}
                onSuggestionSelect={handleSuggestionSelect}
            />
        ),
        subtitle: (
            <Text variant="h5" sx={{fontWeight: 300, fontSize: fluidUnit(1.5)}}>
                {t('forResearchers')}
            </Text>
        ),
        sourcesLine: (
            <Text variant="h5" sx={{fontWeight: 300, fontSize: fluidUnit(1.5)}}>
                {t.rich('sourcesText', {
                    openaire: (chunks) => (
                        <Link
                            href="https://explore.openaire.eu/search/find/projects"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {chunks}
                        </Link>
                    ),
                    ror: (chunks) => (
                        <Link href="https://ror.org/" target="_blank" rel="noopener noreferrer">
                            {chunks}
                        </Link>
                    ),
                    cordis: (chunks) => (
                        <Link href="https://cordis.europa.eu/" target="_blank" rel="noopener noreferrer">
                            {chunks}
                        </Link>
                    ),
                })}
            </Text>
        ),
        useCasesIntro: (
            <Text variant="h4" sx={{textAlign: 'left', fontSize: fluidUnit(2.125)}}>
                {t('orYouCould')}
            </Text>
        ),
        useCaseSection: (
            <UseCaseSection
                useCases={useCases}
                selectedUseCase={selectedUseCase}
                selectedSubUseCaseKey={selectedSubUseCase?.key}
                onSelectUseCase={(key) => {
                    notifyUseCaseSelected()
                    selectUseCase(key)
                }}
                onSelectSubUseCase={selectSubUseCase}
            />
        ),
        footerCta: (
            <Text variant="h5" sx={{fontSize: fluidUnit(1.5)}}>
                {t.rich('haveIdea', {
                    // onClick intentionally left undefined — destination not defined yet.
                    tellUs: (chunks) => (
                        <Link component="button" type="button" sx={{verticalAlign: 'baseline'}}>
                            {chunks}
                        </Link>
                    ),
                })}
            </Text>
        ),
        logoBanner: <LogoBanner />,
    }

    return <HeroLayout {...slots} />
}
