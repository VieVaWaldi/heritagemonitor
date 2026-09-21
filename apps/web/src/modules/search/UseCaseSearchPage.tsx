'use client'

import {Suspense} from 'react'
import Box from '@mui/material/Box'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {Navbar, NAVBAR_HEIGHT_TALL} from '@/common/components'
import {USE_CASES} from '@/common/catalog'
import {LlmChatNavToggle} from '@/common/llmchat/LlmChatNavToggle'
import {useLlmChatContentSx, useLlmChatTopOffset} from '@/common/llmchat/LlmChatRuntime'
import {CorpusUrlBinding} from './components/CorpusUrlBinding'
import {SearchNav} from './components/SearchNav'
import {SearchResultsPanel} from './components/SearchResultsPanel'
import {RESULTS_PANEL_BY_USE_CASE} from './resultsPanelRegistry'

export interface UseCaseSearchPageProps {
    useCaseKey: string
    subUseCaseKey?: string
}

// Shared shell for every /search route: the tall Navbar (with this route's
// ActionBar) plus the results body. Most UseCases render SearchResultsPanel
// (list + tabbed detail, still empty — the API/collection behind each
// UseCase doesn't exist yet); UseCases without hasResultsPanel set (see
// ./common/catalog/useCases) fall back to a plain placeholder — e.g.
// Collaboration, whose right-hand side will likely end up being a
// graph/map widget instead of this same panel.
export function UseCaseSearchPage({useCaseKey, subUseCaseKey}: UseCaseSearchPageProps) {
    // Same app-wide Lucy panel as HomePage — see LlmChatRuntime.
    useLlmChatTopOffset(NAVBAR_HEIGHT_TALL)
    const contentSx = useLlmChatContentSx()

    const useCase = USE_CASES.find((candidate) => candidate.key === useCaseKey) ?? USE_CASES[0]
    const subUseCase = useCase.subUseCases?.find((candidate) => candidate.key === subUseCaseKey)
    const hasResultsPanel = subUseCase?.hasResultsPanel ?? useCase.hasResultsPanel ?? false
    const ResultsPanel = RESULTS_PANEL_BY_USE_CASE[useCaseKey] ?? SearchResultsPanel

    return (
        <>
            {/* SearchNav reads useSearchParams() (to hydrate q/e) — Next requires
                a Suspense boundary around that or the build bails the page out of
                static rendering. Fallback mirrors its own empty shell, endAction
                included, so there's no layout jump (the bar growing by the
                toggle's width) once the real bar hydrates. */}
            <Suspense fallback={<Navbar size="tall" bordered sticky endAction={<LlmChatNavToggle />} />}>
                <SearchNav useCaseKey={useCaseKey} subUseCaseKey={subUseCaseKey} />
            </Suspense>
            {/* Renders nothing: it hands CorpusContext a two-way binding to
                `?c=` for as long as a /search route is open. Needs its own
                Suspense boundary for the same useSearchParams() reason as
                SearchNav — and it cannot live in the root layout's provider,
                which would opt every page out of static rendering. */}
            <Suspense fallback={null}>
                <CorpusUrlBinding />
            </Suspense>
            {/* Leaves room on the right for the app-wide Lucy panel to dock
                beside this content instead of covering it — see
                LlmChatRuntime and HomePage for the same pattern. */}
            <Box sx={contentSx}>
                {hasResultsPanel ? (
                    <Box sx={{height: `calc(100dvh - ${NAVBAR_HEIGHT_TALL}px)`, py: 3}}>
                        {/* Falls back to the shared empty-data placeholder for
                            any UseCase not yet registered in
                            resultsPanelRegistry.ts — i.e. one without a real
                            backend behind it yet. Suspense: a real panel reads
                            its whole state from the URL (common/url), and Next
                            requires useSearchParams() to sit under a boundary
                            or it bails the page out of static rendering. */}
                        <Suspense fallback={null}>
                            <ResultsPanel />
                        </Suspense>
                    </Box>
                ) : (
                    <Box sx={{display: 'flex', justifyContent: 'center', py: fluidUnit(8), px: 3}}>
                        <Text variant="body1" sx={{color: 'text.secondary'}}>
                            Results for &ldquo;{useCaseKey}
                            {subUseCaseKey ? `/${subUseCaseKey}` : ''}&rdquo; — coming soon.
                        </Text>
                    </Box>
                )}
            </Box>
        </>
    )
}
