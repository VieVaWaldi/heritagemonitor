'use client'

import {useTranslations} from 'next-intl'
import Link from '@mui/material/Link'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {ActionBar} from '@/common/components'
import {useCorpus} from '@/common/catalog'
import {buildSearchUrl} from '@/common/url'
import {useHeroSelection} from './hooks/useHeroSelection'
import {useCyclingPlaceholder} from './hooks/useCyclingPlaceholder'
import {useHeroTitle} from './hooks/useHeroTitle'
import {UseCaseSection} from './components/UseCaseSection'
import {LogoBanner} from './components/LogoBanner'
import {HeroLayout} from './layout/HeroLayout'
import type {HeroLayoutSlots} from './layout/types'

// Container: owns state/wiring and builds the slots. No breakpoint-specific
// markup lives here — that's HeroLayout's job
export function HeroPage() {
    const t = useTranslations('Home')

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

    function handleSearchSubmit() {
        if (!activeRoute) return
        const url = buildSearchUrl({
            route: activeRoute,
            query: searchValue,
            entity: selectedEntity,
            corpus: selectedCorpus,
        })
        console.log(url)
        // router.push(url) — enable once /search exists to receive these params
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
