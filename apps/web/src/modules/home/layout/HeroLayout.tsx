import Box from '@mui/material/Box'
import {styled} from '@mui/material/styles'
import {NAVBAR_HEIGHT_MID} from '@/common/components'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {HERO_FLUID_UNIT_DECLARATION} from './heroFluidUnit'
import type {HeroLayoutSlots} from './types'

// Shared width so WelcomeBox and OrYouCouldBox line up on the same column.
const HERO_BLOCK_WIDTH = {xs: '100%', md: '95%'}

// WelcomeBox and OrYouCouldBox no longer flex themselves — they're laid
// out by their parent's `justifyContent: 'space-evenly'` (see below), which
// puts equal gaps before/between/after them regardless of which one's
// content is taller. Splitting the space into two equal-height flex boxes
// instead (flex: '1 1 0' on each, centering its own content) was tried
// first, but OrYouCouldBox's taller content then filled more of its half,
// making it visually hug the fixed bottom block. A rigid 50/50 of the
// *whole page* (git history: "Improved Landing Page") was reverted earlier
// still, for squeezing text unreadably small on short screens — evenly
// spacing content blocks rather than fixed-splitting the page, combined
// with the fluid-unit clamp, is what avoids that.
const WelcomeBox = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
})

const OrYouCouldBox = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
})

// Pure skeleton, no hooks/business logic (apps/web/RULES.md #12).
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
                // being pushed NAVBAR_HEIGHT_MID past it. HomePage's Navbar uses
                // size="mid", so this must match.
                minHeight: `calc(100dvh - ${NAVBAR_HEIGHT_MID}px)`,
                display: 'flex',
                flexDirection: 'column',
                // Matches DIGICHerSection's background — the hero now flows straight
                // into it with no gap, so a mismatch here shows as a visible seam.
                backgroundColor: 'background.paper',
                '--fluid-unit': HERO_FLUID_UNIT_DECLARATION,
            }}
        >
            {/* the flexing region — space-evenly gives WelcomeBox and OrYouCouldBox
                equal gaps above, between, and below, independent of their content height */}
            <Box
                sx={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-evenly',
                    alignItems: 'center',
                }}
            >
                <WelcomeBox sx={{px: {xs: 3, md: fluidUnit(2)}, my: fluidUnit(2)}}>
                    <Box sx={{width: HERO_BLOCK_WIDTH, maxWidth: 1000}}>
                        <Box sx={{pl: fluidUnit(0.5)}}>{title}</Box>
                        <Box sx={{mt: fluidUnit(1.5)}}>{actionBar}</Box>
                        <Box sx={{mt: fluidUnit(1.5), pl: fluidUnit(0.5)}}>{subtitle}</Box>
                        <Box sx={{mt: fluidUnit(0.5), pl: fluidUnit(0.5)}}>{sourcesLine}</Box>
                    </Box>
                </WelcomeBox>

                <OrYouCouldBox sx={{px: {xs: 3, md: fluidUnit(2)}, my: fluidUnit(2)}}>
                    <Box sx={{width: HERO_BLOCK_WIDTH, maxWidth: 1000}}>
                        <Box>{useCasesIntro}</Box>
                        <Box sx={{mt: fluidUnit(1)}}>{useCaseSection}</Box>
                    </Box>
                </OrYouCouldBox>
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
