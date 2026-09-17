'use client'

import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import Diversity2Icon from '@mui/icons-material/Diversity2'

export interface LlmChatNavToggleProps {
    open: boolean
    onToggle: () => void
}

// Lives in Navbar's endAction slot (see HomePage) rather than floating over
// the page or living inside LlmChatBox's own header — a single button for
// both opening and closing, so there's no separate "open" affordance to
// design and no directional close icon to get backwards. The circular
// border is always visible (unlike a plain IconButton, which only shows its
// hover/focus circle) so it reads as a discrete toggle sitting on the bar;
// it fills in primary color while the panel is open to show which state
// it's in.
export function LlmChatNavToggle({open, onToggle}: LlmChatNavToggleProps) {
    return (
        <IconButton
            onClick={onToggle}
            aria-label={open ? 'close Lucy chat' : 'open Lucy chat'}
            aria-pressed={open}
            size="small"
            sx={{
                border: 1,
                borderColor: open ? 'primary.main' : 'divider',
                backgroundColor: open ? 'primary.main' : 'transparent',
                '&:hover': {backgroundColor: open ? 'primary.dark' : 'action.hover'},
            }}
        >
            {open ? (
                <CloseIcon fontSize="small" sx={{color: 'primary.contrastText'}} />
            ) : (
                <Diversity2Icon fontSize="small" sx={{color: 'primary.main'}} />
            )}
        </IconButton>
    )
}
