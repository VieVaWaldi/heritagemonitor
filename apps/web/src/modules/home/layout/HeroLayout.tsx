import Box from '@mui/material/Box'
import {NAVBAR_HEIGHT} from '@/common/components'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {HERO_FLUID_UNIT_DECLARATION} from './heroFluidUnit'
import type {HeroLayoutSlots} from './types'

// Pure skeleton, no hooks/business logic (apps/web/RULES.md #12).
//
// "fluidFixed": top/bottom blocks hug the viewport edges at content size,
// only the middle block (useCasesIntro/useCaseSection) flexes to absorb
// leftover space. minHeight, not height + overflow:hidden, so a too-short
// viewport scrolls instead of clipping. A rigid 50/50 split (git history:
// "Improved Landing Page") was reverted for squeezing text unreadably
// small on short screens — one flexing block is what avoids that.
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
            {/* fixed: hugs the top at content size */}
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

            {/* the one flexing block — grows into leftover space, centers within it */}
            <Box
                sx={{
                    flex: '1 1 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    px: {xs: 3, md: fluidUnit(2)},
                }}
            >
                <Box sx={{width: {xs: '100%', md: '80%'}, maxWidth: 1000}}>
                    <Box>{useCasesIntro}</Box>
                    <Box sx={{mt: fluidUnit(1)}}>{useCaseSection}</Box>
                </Box>
            </Box>

            {/* fixed: hugs the bottom at content size */}
            <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', px: {xs: 3, md: fluidUnit(2)}}}>
                <Box sx={{width: '100%', display: 'flex', justifyContent: 'center', mb: fluidUnit(2)}}>
                    {footerCta}
                </Box>

                {/* full-bleed: cancels the px above so the banner reaches the viewport edges */}
                <Box
                    sx={{
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
