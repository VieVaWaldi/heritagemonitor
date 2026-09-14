'use client'

import {useTranslations} from 'next-intl'
import useMediaQuery from '@mui/material/useMediaQuery'
import {useTheme} from '@mui/material/styles'
import Link from '@mui/material/Link'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {ActionBar, HMMenu, LanguageSelection} from '@/common/components'
import {ENTITIES, CORPUSES} from './data/useCases'
import {useHeroSelection} from './hooks/useHeroSelection'
import {useCyclingPlaceholder} from './hooks/useCyclingPlaceholder'
import {useTypedTitle} from './hooks/useTypedTitle'
import {UseCaseBar} from './components/UseCaseBar'
import {UseCaseContentBar} from './components/UseCaseContentBar'
import {ScrollHint} from './components/ScrollHint'
import {HeroDesktopLayout} from './layout/HeroDesktopLayout'
import {HeroMobileLayout} from './layout/HeroMobileLayout'
import type {HeroLayoutSlots} from './layout/types'

// Container: owns state/wiring and picks the layout for the current
// breakpoint. No breakpoint-specific markup lives here — that's
// HeroDesktopLayout/HeroMobileLayout's job
export function HeroPage() {
    const t = useTranslations('Home')
    const theme = useTheme()
    const isDesktop = true; // useMediaQuery(theme.breakpoints.up('md')) // overwritten until HeroMobileLayout.tsx exists

    const {
        useCases,
        selectedUseCase,
        selectedSubUseCase,
        activeExamples,
        selectedEntity,
        selectedCorpus,
        searchValue,
        selectUseCase,
        selectSubUseCase,
        setSearchValue,
        setSelectedEntity,
        setSelectedCorpus,
    } = useHeroSelection()

    const placeholder = useCyclingPlaceholder(activeExamples)
    const typedTitle = useTypedTitle(selectedUseCase.title)

    const slots: HeroLayoutSlots = {
        menu: <HMMenu variant="plain" size={40} />,
        languageSelector: <LanguageSelection />,
        title: (
            <Text variant="h3" component="h1" sx={{fontSize: fluidUnit(3)}}>
                {typedTitle || ' '}
            </Text>
        ),
        actionBar: (
            <ActionBar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                placeholder={placeholder}
                entityOptions={ENTITIES}
                selectedEntity={selectedEntity}
                onEntityChange={setSelectedEntity}
                corpusOptions={CORPUSES}
                selectedCorpus={selectedCorpus}
                onCorpusChange={setSelectedCorpus}
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
        useCaseBar: (
            <UseCaseBar useCases={useCases} selectedKey={selectedUseCase.key} onSelect={selectUseCase} />
        ),
        useCaseContent: (
            <UseCaseContentBar
                useCase={selectedUseCase}
                selectedSubUseCaseKey={selectedSubUseCase?.key}
                onSelectSubUseCase={selectSubUseCase}
            />
        ),
        footerCta: (
            <Text variant="h5" sx={{fontSize: fluidUnit(1.5)}}>
                {t.rich('haveIdea', {
                    // onClick intentionally left undefined — destination not defined yet.
                    tellUs: (chunks) => (
                        <Link component="button" type="button">
                            {chunks}
                        </Link>
                    ),
                })}
            </Text>
        ),
        scrollHint: <ScrollHint label={t('scrollDown')} />,
    }

    return isDesktop ? <HeroDesktopLayout {...slots} /> : <HeroMobileLayout {...slots} />
}
