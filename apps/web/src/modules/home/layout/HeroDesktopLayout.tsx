import Box from '@mui/material/Box'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {HERO_FLUID_UNIT_DECLARATION} from './heroFluidUnit'
import type {HeroLayoutSlots} from './types'

// Pure skeleton — desktop split, no hooks/business logic (apps/web/RULES.md
// #12). HeroPage builds the content, this only places it. Top/bottom halves
// are pinned to exactly 50% height each (flex: '0 0 50%' + minHeight: 0) so
// switching UseCase never reflows the split — overflowing content scrolls
export function HeroDesktopLayout({
    menu,
    languageSelector,
    title,
    actionBar,
    subtitle,
    sourcesLine,
    useCasesIntro,
    useCaseBar,
    useCaseContent,
    footerCta,
    scrollHint,
    logoBanner,
}: HeroLayoutSlots) {
    return (
        <Box
            sx={{
                position: 'relative',
                height: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                '--fluid-unit': HERO_FLUID_UNIT_DECLARATION,
            }}
        >
            <Box sx={{position: 'absolute', top: fluidUnit(1.5), left: fluidUnit(1.5), zIndex: 1}}>{menu}</Box>
            <Box sx={{position: 'absolute', top: fluidUnit(1.5), right: fluidUnit(1.5), zIndex: 1}}>
                {languageSelector}
            </Box>

            <Box
                sx={{
                    flex: '0 0 50%',
                    minHeight: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    px: fluidUnit(2),
                }}
            >
                <Box sx={{width: '60%'}}>
                    <Box sx={{pl: fluidUnit(0.5)}}>{title}</Box>
                    <Box sx={{mt: fluidUnit(1.5)}}>{actionBar}</Box>
                    <Box sx={{mt: fluidUnit(1.5), pl: fluidUnit(0.5)}}>{subtitle}</Box>
                    <Box sx={{mt: fluidUnit(0.5), pl: fluidUnit(0.5)}}>{sourcesLine}</Box>
                </Box>
            </Box>

            <Box
                sx={{
                    flex: '0 0 50%',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    overflow: 'hidden',
                    px: fluidUnit(2),
                }}
            >
                <Box
                    sx={{
                        width: '80%',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        mt: fluidUnit(1),
                    }}
                >
                    <Box sx={{flex: 'none'}}>{useCasesIntro}</Box>
                    <Box sx={{flex: 'none', mt: fluidUnit(1)}}>{useCaseBar}</Box>
                    {useCaseContent}
                </Box>

                {/* scrollHint anchors to this row (not the viewport) so it always
                    sits directly above logoBanner, whatever the banner's height. */}
                <Box sx={{flex: 'none', width: '100%', position: 'relative', display: 'flex', justifyContent: 'center'}}>
                    <Box sx={{position: 'absolute', left: fluidUnit(-0.5), bottom: 0}}>{scrollHint}</Box>
                    {footerCta}
                </Box>

                {/* Full-bleed: cancels the px: fluidUnit(2) above so the banner's
                    background/border reach the viewport edges like everywhere else
                    the banner is used, instead of stopping at the hero's content inset. */}
                <Box
                    sx={{
                        flex: 'none',
                        width: `calc(100% + ${fluidUnit(4)})`,
                        mx: fluidUnit(-2),
                        mt: fluidUnit(1),
                    }}
                >
                    {logoBanner}
                </Box>
            </Box>
        </Box>
    )
}
