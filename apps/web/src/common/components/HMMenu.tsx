'use client'

import {useState} from 'react'
import type {ReactNode} from 'react'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import MenuIcon from '@mui/icons-material/Menu'
import NextLink from 'next/link'
import {Text} from '@/common/text'
import {ThemeToggle} from '@/common/theme/ThemeToggle'
import {useActiveUseCase} from '@/common/hooks/useActiveUseCase'
import {SideMenu} from './SideMenu'
import {MenuUseCaseList} from './MenuUseCaseList'

// Matches CorpusPanel's collapsed row height (./CorpusPanel.tsx) — the two
// sit at opposite ends of the shared Navbar (./Navbar.tsx) and should read
// as a pair.
const BAR_HEIGHT = 44

// Desktop-only for now, per the wordmark's fixed width and SideMenu's fixed
// SIDE_MENU_WIDTH — a phone-sized HMMenu (bottom sheet, icon-only trigger,
// etc.) is a different component, not a breakpoint on this one.
//
// Hugs the left edge of the shared Navbar. No chrome of its own — just the
// icon and wordmark sitting directly on the bar, per digicher_webinterface's
// BurgerMenu. Opens the app's left side menu: the app title (links home),
// theme settings, and the same 5 UseCases HeroPage offers, with whichever
// one matches the current route (via useActiveUseCase) shown selected.
// Self-contained: owns its own open state rather than taking an onClick,
// since nothing outside it needs to know whether the menu is open.
export function HMMenu() {
    const [open, setOpen] = useState(false)
    const {useCaseKey, subUseCaseKey} = useActiveUseCase()

    function close() {
        setOpen(false)
    }

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
                <SideMenu
                    side="left"
                    title={
                        <Link component={NextLink} href="/" onClick={close} underline="hover" sx={{color: 'inherit'}}>
                            HeritageMonitor
                        </Link>
                    }
                    open={open}
                    onClose={close}
                >
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
                        <MenuSection heading="Settings">
                            <ThemeToggle />
                        </MenuSection>

                        <Divider />

                        <MenuSection heading="Explore">
                            <MenuUseCaseList
                                activeUseCaseKey={useCaseKey}
                                activeSubUseCaseKey={subUseCaseKey}
                                onNavigate={close}
                            />
                        </MenuSection>
                    </Box>
                </SideMenu>
            </Box>
        </>
    )
}

// No auth/downloads/other-settings sections yet — see module comment above,
// nothing to hang them off of until those features exist.
function MenuSection({heading, children}: {heading: string; children: ReactNode}) {
    return (
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
            <Text variant="overline" sx={{color: 'text.secondary', letterSpacing: 1}}>
                {heading}
            </Text>
            {children}
        </Box>
    )
}
