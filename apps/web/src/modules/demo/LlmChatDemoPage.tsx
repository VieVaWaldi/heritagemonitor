'use client'

import Box from '@mui/material/Box'
import {NAVBAR_HEIGHT} from '@/common/components'
import {LlmChatBox} from '@/common/llmchat/LlmChatBox'
import {Text} from '@/common/text'

// Test harness for common/llmchat, not a real feature page — see the plan
// discussed for the eventual /search sidebar integration. Deliberately
// undecorated: the point here is to exercise the api + adapter, not the page.
//
// fluidFixed layout (see HeroLayout): DemoNav is a fixed-height sibling above
// this, so the root's minHeight subtracts it — LlmChatBox is the one
// flex-grow filler that absorbs whatever's left of the viewport.
export function LlmChatDemoPage() {
    return (
        <Box
            sx={{
                minHeight: `calc(100dvh - ${NAVBAR_HEIGHT}px)`,
                display: 'flex',
                flexDirection: 'column',
                p: 4,
                maxWidth: 800,
            }}
        >
            <Text variant="h4" component="h1" sx={{mb: 1}}>
                LLM Chat
            </Text>
            <Text variant="body2" color="text.secondary" sx={{mb: 4}}>
                Exercises common/llmchat end to end against apps/api's OpenRouter-backed
                /v1/llmchat/stream endpoint.
            </Text>

            {/* LlmChatBox itself carries no border/radius/overflow chrome —
                LlmChatSidePanel supplies that for the docked /home & /search
                case, so this standalone page supplies its own instead. */}
            <LlmChatBox
                sx={{
                    flex: 1,
                    minHeight: 0,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                }}
            />
        </Box>
    )
}
