import Box from '@mui/material/Box'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {HERO_FLUID_UNIT_DECLARATION} from './heroFluidUnit'
import type {HeroLayoutSlots} from './types'

// Pure skeleton — desktop split, no hooks/business logic (apps/web/RULES.md
// #12). HeroPage builds the content, this only places it. Top/bottom halves
// are pinned to exactly 50% height each (flex: '0 0 50%' + minHeight: 0) so
// switching UseCase never reflows the split — overflowing content scrolls
// inside UseCaseContentBar instead of growing this layout.
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
            <Box sx={{position: 'absolute', bottom: fluidUnit(1.5), left: fluidUnit(1.5), zIndex: 1}}>
                {scrollHint}
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
                    pb: fluidUnit(1.5),
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
                <Box sx={{flex: 'none'}}>{footerCta}</Box>
            </Box>
        </Box>
    )
}
