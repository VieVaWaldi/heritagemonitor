'use client'

import Box from '@mui/material/Box'
import Diversity2Icon from '@mui/icons-material/Diversity2'
import {Text} from '@/common/text'

// Right side, via ChatBox's `conversationHeaderActions` slot — already
// pushed to the far right by @mui/x-chat's own layout (marginInlineStart:
// auto), so no positioning needed here.
export function LlmChatHeaderRight() {
    return (
        // marginInlineStart: 'auto' replaces the same rule the default
        // ChatConversationHeaderActions carries — lost since this slot swaps
        // that component outright rather than wrapping it. Stacked column
        // (not the title row's own flex row) so the caption sits on its own
        // line below "Lucy", still above the message list beneath the header.
        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25, marginInlineStart: 'auto'}}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                <Text variant="h1" component="span" sx={{fontSize: '1.75rem'}}>
                    Lucy
                </Text>
                <Diversity2Icon sx={{color: 'primary.main', fontSize: '2rem'}} />
            </Box>
            {/* Same variant/color as CorpusPanel's grey "Corpus" label. */}
            <Text variant="button" sx={{color: 'text.disabled'}}>
                Lucy knows your current page and data
            </Text>
        </Box>
    )
}
