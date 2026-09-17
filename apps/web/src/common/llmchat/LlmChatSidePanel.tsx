'use client'

import Box from '@mui/material/Box'
import {NAVBAR_BORDER_COLOR} from '@/common/components'
import {LlmChatBox} from './LlmChatBox'

export interface LlmChatSidePanelProps {
    /** Pixel height of the host page's navbar — the panel is sticky right
     * under it and sized to exactly fill the rest of the viewport. */
    topOffset: number
}

// Docked chat panel meant as a flex sibling next to a page's main content
// column (see HomePage) rather than an overlay — the parent's flex row is
// what makes the content column narrow to fit this instead of it covering
// content. `position: sticky` (not fixed) so it still respects that flex
// row's width, but stays pinned to the viewport instead of scrolling away
// with the (typically much taller) page content beside it.
export function LlmChatSidePanel({topOffset}: LlmChatSidePanelProps) {
    return (
        <Box
            sx={{
                position: 'sticky',
                top: topOffset,
                alignSelf: 'flex-start',
                flex: 'none',
                width: 'clamp(280px, 20vw, 420px)',
                height: `calc(100dvh - ${topOffset}px)`,
                // Owns the border/card chrome LlmChatBox used to draw around
                // itself — LlmChatBox now fills this panel edge-to-edge. No
                // border-radius: the panel is flush against the viewport
                // edge, so rounded corners would only show (oddly) on the
                // two corners away from the edge. Same style/color as
                // Navbar's own border (NAVBAR_BORDER_COLOR) so the panel
                // reads as part of the same top-chrome — no top border since
                // the navbar sitting right above it already draws that line.
                border: '1px solid',
                borderTop: 'none',
                borderColor: NAVBAR_BORDER_COLOR,
                overflow: 'hidden',
            }}
        >
            <LlmChatBox sx={{height: '100%'}} />
        </Box>
    )
}
