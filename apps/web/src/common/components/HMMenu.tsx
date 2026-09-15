'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import {Text} from '@/common/text'
import {SideMenu} from './SideMenu'

// Matches CorpusPanel's collapsed row height (./CorpusPanel.tsx) — the two
// sit at opposite ends of the shared Navbar (./Navbar.tsx) and should read
// as a pair.
const BAR_HEIGHT = 44

// Hugs the left edge of the shared Navbar. No chrome of its own — just the
// icon and wordmark sitting directly on the bar, per digicher_webinterface's
// BurgerMenu. Opens the app's left side menu, which has no content yet.
// Self-contained: owns its own open state rather than taking an onClick,
// since nothing outside it needs to know whether the menu is open.
export function HMMenu() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <IconButton
                onClick={() => setOpen(true)}
                aria-label="Menu"
                aria-expanded={open}
                sx={{
                    height: BAR_HEIGHT,
                    borderRadius: 0,
                    color: 'text.primary',
                }}
            >
                <MenuIcon />
                {/* variant="h5" — same weight (500) and EB Garamond family as
                    the old webinterface's wordmark, no bold override. */}
                <Text variant="h5" sx={{ml: 0.5}}>
                    HM
                </Text>
            </IconButton>

            {/* Fixed, viewport-spanning ancestor so SideMenu's absolute
                positioning fills the screen instead of some nearby
                relatively-positioned box. */}
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: (t) => t.zIndex.drawer,
                    pointerEvents: open ? 'auto' : 'none',
                }}
            >
                <SideMenu side="left" title="Menu" open={open} onClose={() => setOpen(false)}>
                    {null}
                </SideMenu>
            </Box>
        </>
    )
}
