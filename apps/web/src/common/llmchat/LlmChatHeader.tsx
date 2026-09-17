'use client'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import Diversity2Icon from '@mui/icons-material/Diversity2'
import {Text} from '@/common/text'

// Left side of the conversation header. Swapped in via ChatBox's
// `conversationHeaderInfo` slot, which normally wraps the title/subtitle —
// this replaces that content outright (rather than adding to it) with a
// placeholder expand/collapse affordance that has no behavior yet.
export function LlmChatHeaderLeft() {
    return (
        <IconButton size="small" aria-label="toggle panel" disableRipple>
            <ChevronLeftIcon fontSize="small" sx={{color: 'text.secondary'}} />
        </IconButton>
    )
}

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
