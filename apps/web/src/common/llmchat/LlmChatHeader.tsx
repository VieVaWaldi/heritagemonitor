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
        // that component outright rather than wrapping it.
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, marginInlineStart: 'auto'}}>
            <Text variant="h1" component="span" sx={{fontSize: '1.75rem'}}>
                Lucy
            </Text>
            <Diversity2Icon sx={{color: 'primary.main', fontSize: '2rem'}} />
        </Box>
    )
}
