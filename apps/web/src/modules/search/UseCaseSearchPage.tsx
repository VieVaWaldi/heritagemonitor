'use client'

import {Suspense, useState} from 'react'
import Box from '@mui/material/Box'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {Navbar, NAVBAR_HEIGHT_TALL} from '@/common/components'
import {LlmChatNavToggle} from '@/common/llmchat/LlmChatNavToggle'
import {LlmChatSidePanel} from '@/common/llmchat/LlmChatSidePanel'
import {SearchNav} from './components/SearchNav'

export interface UseCaseSearchPageProps {
    useCaseKey: string
    subUseCaseKey?: string
}

// Shared shell for every /search route: the tall Navbar (with this route's
// ActionBar) plus a placeholder body. Results UI is intentionally not built
// yet — the indices/pipelines behind each UseCase don't exist. Once a given
// UseCase's data is wired up, split its results body out of this shared
// placeholder into its own module/component.
export function UseCaseSearchPage({useCaseKey, subUseCaseKey}: UseCaseSearchPageProps) {
    const [chatOpen, setChatOpen] = useState(false)
    const handleChatToggle = () => setChatOpen((open) => !open)

    return (
        <>
            {/* SearchNav reads useSearchParams() (to hydrate q/e) — Next requires
                a Suspense boundary around that or the build bails the page out of
                static rendering. Fallback mirrors its own empty shell, endAction
                included, so there's no layout jump (the bar growing by the
                toggle's width) once the real bar hydrates. */}
            <Suspense
                fallback={
                    <Navbar
                        size="tall"
                        bordered
                        sticky
                        endAction={<LlmChatNavToggle open={chatOpen} onToggle={handleChatToggle} />}
                    />
                }
            >
                <SearchNav
                    useCaseKey={useCaseKey}
                    subUseCaseKey={subUseCaseKey}
                    chatOpen={chatOpen}
                    onChatToggle={handleChatToggle}
                />
            </Suspense>
            {/* Flex row so the Lucy panel docks beside the results instead of
                overlaying them — see HomePage for the same pattern. */}
            <Box sx={{display: 'flex', alignItems: 'flex-start'}}>
                <Box sx={{flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center', py: fluidUnit(8), px: 3}}>
                    <Text variant="body1" sx={{color: 'text.secondary'}}>
                        Results for &ldquo;{useCaseKey}
                        {subUseCaseKey ? `/${subUseCaseKey}` : ''}&rdquo; — coming soon.
                    </Text>
                </Box>
                {chatOpen && <LlmChatSidePanel topOffset={NAVBAR_HEIGHT_TALL} />}
            </Box>
        </>
    )
}
