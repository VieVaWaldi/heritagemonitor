import Box from '@mui/material/Box'
import {NAVBAR_HEIGHT} from '@/common/components'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {HERO_FLUID_UNIT_DECLARATION} from './heroFluidUnit'
import type {HeroLayoutSlots} from './types'

// Pure skeleton, no hooks/business logic (apps/web/RULES.md #12). HeroPage
// builds the content, this only places it. Single layout for all
// breakpoints: full-width content with a small side inset on mobile,
// narrower centered columns from md up.
//
// TEMPORARILY not pinned to 100dvh — was squeezing everything unreadably
// narrow/small on short laptop screens (fluidUnit floors at 12px, but a
// forced-50%-height split still has to fit title+search+useCases in half
// a short viewport). Root Box and the two halves now size to content
// instead of being clamped to exactly one screen. If this reads better,
// the old pinned-split version is in git history (commit "Improved Landing
// Page") to restore; if not, revert this file.
export function HeroLayout({
    title,
    actionBar,
    subtitle,
    sourcesLine,
    useCasesIntro,
    useCaseSection,
    footerCta,
    logoBanner,
}: HeroLayoutSlots) {
    return (
        <Box
            sx={{
                position: 'relative',
                // HomePage renders Navbar as a sibling above this layout (so it
                // can stay sticky across the whole page, not just the hero) —
                // subtracting its height here is what keeps the bottom-pinned
                // footerCta/logoBanner landing at the viewport edge instead of
                // being pushed NAVBAR_HEIGHT past it.
                minHeight: `calc(100dvh - ${NAVBAR_HEIGHT}px)`,
                display: 'flex',
                flexDirection: 'column',
                // Matches DIGICHerSection's background — the hero now flows straight
                // into it with no gap, so a mismatch here shows as a visible seam.
                backgroundColor: 'background.paper',
                '--fluid-unit': HERO_FLUID_UNIT_DECLARATION,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: {xs: 3, md: fluidUnit(2)},
                    py: fluidUnit(8),
                }}
            >
                <Box sx={{width: {xs: '100%', md: '60%'}, maxWidth: 1000}}>
                    <Box sx={{pl: fluidUnit(0.5)}}>{title}</Box>
                    <Box sx={{mt: fluidUnit(1.5)}}>{actionBar}</Box>
                    <Box sx={{mt: fluidUnit(1.5), pl: fluidUnit(0.5)}}>{subtitle}</Box>
                    <Box sx={{mt: fluidUnit(0.5), pl: fluidUnit(0.5)}}>{sourcesLine}</Box>
                </Box>
            </Box>

            {/* flex: '1 0 auto' — on a tall/spacious screen this grows to fill
                whatever's left of the root's minHeight: 100dvh; the scrollHint/
                footerCta row's mt: 'auto' below then eats that slack, pinning
                that row and logoBanner together to the bottom of the screen.
                On a short/crowded screen there's no slack to grow into, so
                this just sits at its natural content height. */}
            <Box
                sx={{
                    flex: '1 0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    px: {xs: 3, md: fluidUnit(2)},
                    pb: fluidUnit(0),
                }}
            >
                <Box
                    sx={{
                        width: {xs: '100%', md: '80%'},
                        maxWidth: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        mb: 2,
                    }}
                >
                    <Box sx={{flex: 'none'}}>{useCasesIntro}</Box>
                    <Box sx={{flex: 'none', mt: fluidUnit(1)}}>{useCaseSection}</Box>
                </Box>

                {/* mt: 'auto' pins this row (and logoBanner right after it) to the
                    bottom of the flex column above (see the flex: '1 0 auto' box
                    this lives in) when there's slack to absorb; the useCaseContent
                    wrapper's own mb above is the floor for when there's none. */}
                <Box
                    sx={{
                        flex: 'none',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        mt: 'auto',
                        mb: fluidUnit(2),
                    }}
                >
                    {footerCta}
                </Box>

                {/* Full-bleed: cancels the px above (both breakpoints) so the banner's
                    background/border reach the viewport edges like everywhere else
                    the banner is used, instead of stopping at the hero's content inset. */}
                <Box
                    sx={{
                        flex: 'none',
                        width: {xs: 'calc(100% + 48px)', md: `calc(100% + ${fluidUnit(4)})`},
                        mx: {xs: -3, md: fluidUnit(-2)},
                    }}
                >
                    {logoBanner}
                </Box>
            </Box>
        </Box>
    )
}
