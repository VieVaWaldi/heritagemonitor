'use client'

import Box from '@mui/material/Box'
import {Navbar, NAVBAR_HEIGHT_MID} from '@/common/components'
import {LlmChatNavToggle} from '@/common/llmchat/LlmChatNavToggle'
import {useLlmChatContentSx, useLlmChatTopOffset} from '@/common/llmchat/LlmChatRuntime'
import {HeroPage} from './HeroPage'
import {DIGICHerSection} from './components/DIGICHerSection'
import {InformationSection} from './components/InformationSection'
import {Footer} from './components/Footer'

export function HomePage() {
    // Publishes this page's Navbar height so the one app-wide Lucy panel
    // (see LlmChatRuntime, mounted in app/layout.tsx) docks directly under
    // it — and leaves matching room on the right so the panel docks beside
    // this content instead of covering it, same visual result as before
    // that panel moved out of this page's own tree.
    useLlmChatTopOffset(NAVBAR_HEIGHT_MID)
    const contentSx = useLlmChatContentSx()

    return (
        <>
            <Navbar sticky bordered size="mid" endAction={<LlmChatNavToggle />} />
            <Box sx={contentSx}>
                <HeroPage />
                <DIGICHerSection />
                <InformationSection />
                <Footer />
            </Box>
        </>
    )
}
