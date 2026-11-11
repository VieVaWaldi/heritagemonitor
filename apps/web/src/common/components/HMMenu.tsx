'use client'

import {useState} from 'react'
import type {ReactNode} from 'react'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import MenuIcon from '@mui/icons-material/Menu'
import NextLink from 'next/link'
import {Text} from '@/common/text'
import {ThemeToggle} from '@/common/theme/ThemeToggle'
import {useActiveUseCase} from '@/common/hooks/useActiveUseCase'
import {MOBILE_BOTTOM_BAR_GUTTER, MOBILE_BOTTOM_BAR_HEIGHT, MOBILE_FAB_SIZE, MOBILE_SIDE_MENU_WIDTH} from './mobileLayout'
import {SideMenu} from './SideMenu'
import {MenuUseCaseList} from './MenuUseCaseList'

// Matches CorpusPanel's collapsed row height (./CorpusPanel.tsx) — the two
// sit at opposite ends of the shared Navbar (./Navbar.tsx) and should read
// as a pair.
const BAR_HEIGHT = 44

export interface HMMenuProps {
    /**
     * `inline` (default): the wordmark button hugging the Navbar's left
     * edge, as on every page today. `fab`: a fixed circle at the bottom
     * right instead — for a route whose own mobile layout already has a
     * bottom switcher bar (see modules/search/entity/MobilePaneSwitcher)
     * reserving exactly this much room at its right edge via
     * MOBILE_BOTTOM_BAR_GUTTER/MOBILE_FAB_SIZE, so the two read as one bar.
     */
    trigger?: 'inline' | 'fab'
    /** Rendered as its own MenuSection(s) between Settings and Explore — e.g.
     * /search's mobile layout folding in Corpus and Lucy, which otherwise
     * have nowhere to go once they're squeezed out of a mobile Navbar. A
     * render prop (not plain ReactNode) so a row that performs an action
     * other than navigating — unlike MenuUseCaseList's own rows, which close
     * this via `onNavigate` as part of following a link — can still close
     * the menu afterwards; MenuUseCaseList's rows keep using their own
     * `onNavigate` for that same purpose. */
    extraSections?: (close: () => void) => ReactNode
}

// Hugs the left edge of the shared Navbar (trigger="inline", the default —
// everywhere except /search's mobile layout), or floats as a bottom-right
// circle (trigger="fab"). No chrome of its own in the inline case — just the
// icon and wordmark sitting directly on the bar, per digicher_webinterface's
// BurgerMenu. Opens the app's left side menu: the app title (links home),
// theme settings, optionally `extraSections`, and the same 5 UseCases
// HeroPage offers, with whichever one matches the current route (via
// useActiveUseCase) shown selected. Self-contained: owns its own open state
// rather than taking an onClick, since nothing outside it needs to know
// whether the menu is open.
export function HMMenu({trigger = 'inline', extraSections}: HMMenuProps) {
    const [open, setOpen] = useState(false)
    const {useCaseKey, subUseCaseKey} = useActiveUseCase()

    function close() {
        setOpen(false)
    }

    return (
        <>
            {trigger === 'inline' ? (
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
            ) : (
                <Fab
                    onClick={() => setOpen(true)}
                    aria-label="Menu"
                    aria-expanded={open}
                    size="medium"
                    color="primary"
                    sx={{
                        position: 'fixed',
                        // Centered on the switcher bar's own height, matching
                        // gutter on its right edge — see MobilePaneSwitcher.
                        bottom: (MOBILE_BOTTOM_BAR_HEIGHT - MOBILE_FAB_SIZE) / 2,
                        right: MOBILE_BOTTOM_BAR_GUTTER,
                        width: MOBILE_FAB_SIZE,
                        height: MOBILE_FAB_SIZE,
                        // Plain appBar — this is enough on its own since it's
                        // inside Navbar's own stacking context (Navbar is
                        // `position: sticky` with its own zIndex: appBar).
                        // MobilePaneSwitcher's bottom bar is kept one BELOW
                        // appBar for exactly this reason — see its own
                        // comment for why a higher z-index here alone
                        // couldn't fix this.
                        zIndex: (t) => t.zIndex.appBar,
                    }}
                >
                    <MenuIcon />
                </Fab>
            )}

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
                {/* Dims the page behind the menu and swallows the click that
                    dismisses it. Below SideMenu's own z-index (1000) so the
                    panel stays lit, and only interactive while open — a
                    permanently mounted overlay would eat every click on the
                    site. */}
                {open && (
                    <Box
                        onClick={close}
                        aria-hidden
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 999,
                            backgroundColor: 'rgba(0, 0, 0, 0.45)',
                        }}
                    />
                )}

                <SideMenu
                    side="left"
                    title={
                        <Link component={NextLink} href="/" onClick={close} underline="hover" sx={{color: 'inherit'}}>
                            HeritageMonitor
                        </Link>
                    }
                    open={open}
                    onClose={close}
                    // Only the fab trigger (mobile) needs a narrower, non-full
                    // width menu — the inline trigger keeps today's fixed
                    // SIDE_MENU_WIDTH everywhere it's still used.
                    width={trigger === 'fab' ? MOBILE_SIDE_MENU_WIDTH : undefined}
                >
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
                        <MenuSection heading="Settings">
                            <ThemeToggle />
                        </MenuSection>

                        {extraSections && <Divider />}
                        {extraSections?.(close)}

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

// Exported so a caller's `extraSections` (e.g. /search's mobile Corpus/Lucy
// rows) reads as part of the same menu instead of a visually distinct block.
export function MenuSection({heading, children}: {heading: string; children: ReactNode}) {
    return (
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
            <Text variant="overline" sx={{color: 'text.secondary', letterSpacing: 1}}>
                {heading}
            </Text>
            {children}
        </Box>
    )
}
