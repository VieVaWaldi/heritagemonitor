'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import {Navbar, NAVBAR_HEIGHT_MID} from '@/common/components'
import {LlmChatNavToggle} from '@/common/llmchat/LlmChatNavToggle'
import {LlmChatSidePanel} from '@/common/llmchat/LlmChatSidePanel'
import {HeroPage} from './HeroPage'
import {DIGICHerSection} from './components/DIGICHerSection'
import {InformationSection} from './components/InformationSection'
import {Footer} from './components/Footer'

export function HomePage() {
    const [chatOpen, setChatOpen] = useState(false)

    return (
        <>
            <Navbar
                sticky
                bordered
                size="mid"
                endAction={<LlmChatNavToggle open={chatOpen} onToggle={() => setChatOpen((open) => !open)} />}
            />
            {/* Flex row so the Lucy panel docks beside the page content
                instead of overlaying it — see LlmChatSidePanel. */}
            <Box sx={{display: 'flex', alignItems: 'flex-start'}}>
                <Box sx={{flex: 1, minWidth: 0}}>
                    <HeroPage />
                    <DIGICHerSection />
                    <InformationSection />
                    <Footer />
                </Box>

                {chatOpen && <LlmChatSidePanel topOffset={NAVBAR_HEIGHT_MID} />}
            </Box>
        </>
    )
}
