'use client'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import {alpha} from '@mui/material/styles'
import type {Theme} from '@mui/material/styles'
import type {ReactNode} from 'react'
import {HMMenu} from './HMMenu'
import {CorpusPanel} from './CorpusPanel'

// Single source of truth for the bar's height — HeroLayout subtracts this
// from its own 100dvh so the hero's bottom-pinned content (footerCta,
// logoBanner) still lands exactly at the viewport edge instead of being
// pushed past it by the navbar sitting above.
export const NAVBAR_HEIGHT = 44

export const NAVBAR_HEIGHT_TALL = NAVBAR_HEIGHT * 2

export const NAVBAR_HEIGHT_MID = NAVBAR_HEIGHT * 1.5

export const NAVBAR_BORDER_COLOR = (theme: Theme) => alpha(theme.palette.divider, 0.5)

export interface NavbarProps {
    /** Adds a divider under the bar — deliberately faint (a fraction of the
     * theme's own divider color) since it's just a soft hint of a break, not
     * a hard rule. Default (none) is for pages like the hero that flow
     * straight into content sharing the same background; turn it on for
     * pages (health/demo) whose content needs that hint. */
    bordered?: boolean
    /** Pins the bar to the top of its scroll container instead of scrolling
     * away with the page. */
    sticky?: boolean
    /** 'tall' doubles the bar's height (see NAVBAR_HEIGHT_TALL) — for
     * content heavier than a tab strip, e.g. /search's ActionBar. 'mid' is
     * 1.5x height (see NAVBAR_HEIGHT_MID) — used by the home page. Defaults
     * to 'default'. */
    size?: 'default' | 'mid' | 'tall'
    /** Page-specific content, placed between HMMenu and the corpus selector — e.g. a route's own tab strip. */
    children?: ReactNode
    /** Extra action(s) hugging the right edge past the corpus selector, e.g.
     * the Lucy chat toggle — set off from CorpusPanel by a vertical divider
     * so it doesn't read as part of the corpus control. Omitted entirely
     * (no divider either) on pages with nothing to put there. */
    endAction?: ReactNode
    /** A vertical divider right after HMMenu, the same one that sets endAction off from the corpus selector — for pages whose own content starts at the menu's edge (the search pages' use-case label). */
    startDivider?: boolean
}

// App-wide top bar: HMMenu hugs the left edge, the corpus selector hugs the
// right, and any page-specific content (tabs, an ActionBar, etc.) fills the
// middle.
export function Navbar({bordered = false, sticky = false, size = 'default', children, endAction, startDivider = false}: NavbarProps) {
    return (
        <Box
            component="nav"
            sx={{
                position: sticky ? 'sticky' : 'static',
                top: 0,
                zIndex: (t) => t.zIndex.appBar,
                display: 'flex',
                alignItems: 'center',
                height: size === 'tall' ? NAVBAR_HEIGHT_TALL : size === 'mid' ? NAVBAR_HEIGHT_MID : NAVBAR_HEIGHT,
                backgroundColor: 'background.paper',
                borderBottom: bordered ? 1 : 0,
                borderColor: NAVBAR_BORDER_COLOR,
            }}
        >
            <HMMenu />
            {startDivider && <Divider orientation="vertical" flexItem sx={{my: 1}} />}
            <Box sx={{flex: 1, minWidth: 0, height: '100%', display: 'flex', alignItems: 'center', px: startDivider ? 1.5 : 2}}>
                {children}
            </Box>
            <CorpusPanel />
            {endAction && (
                <>
                    <Divider orientation="vertical" flexItem sx={{my: 1}} />
                    <Box sx={{display: 'flex', alignItems: 'center', px: 1}}>{endAction}</Box>
                </>
            )}
        </Box>
    )
}
