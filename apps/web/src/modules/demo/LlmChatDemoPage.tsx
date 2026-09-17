'use client'

import Box from '@mui/material/Box'
import {LlmChatBox} from '@/common/llmchat/LlmChatBox'
import {Text} from '@/common/text'

// Test harness for common/llmchat, not a real feature page — see the plan
// discussed for the eventual /search sidebar integration. Deliberately
// undecorated: the point here is to exercise the api + adapter, not the page.
export function LlmChatDemoPage() {
    return (
        <Box sx={{p: 4, maxWidth: 800}}>
            <Text variant="h4" component="h1" sx={{mb: 1}}>
                LLM Chat
            </Text>
            <Text variant="body2" color="text.secondary" sx={{mb: 4}}>
                Exercises common/llmchat end to end against apps/api's OpenRouter-backed
                /v1/llmchat/stream endpoint.
            </Text>

            <LlmChatBox sx={{height: 600, border: '1px solid', borderColor: 'divider'}} />
        </Box>
    )
}
