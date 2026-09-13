import Box from '@mui/material/Box'
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
        <Box sx={{position: 'relative', height: '100dvh', display: 'flex', flexDirection: 'column'}}>
            <Box sx={{position: 'absolute', top: 24, left: 24, zIndex: 1}}>{menu}</Box>
            <Box sx={{position: 'absolute', top: 24, right: 24, zIndex: 1}}>{languageSelector}</Box>
            <Box sx={{position: 'absolute', bottom: 24, left: 24, zIndex: 1}}>{scrollHint}</Box>

            <Box
                sx={{
                    flex: '0 0 50%',
                    minHeight: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    px: 4,
                }}
            >
                <Box sx={{width: '60%'}}>
                    <Box sx={{pl: 1}}>{title}</Box>
                    <Box sx={{mt: 3}}>{actionBar}</Box>
                    <Box sx={{mt: 3, pl: 1}}>{subtitle}</Box>
                    <Box sx={{mt: 1, pl: 1}}>{sourcesLine}</Box>
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
                    px: 4,
                    pb: 3,
                }}
            >
                <Box
                    sx={{
                        width: '80%',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        mt: 2,
                    }}
                >
                    <Box sx={{flex: 'none'}}>{useCasesIntro}</Box>
                    <Box sx={{flex: 'none', mt: 2}}>{useCaseBar}</Box>
                    {useCaseContent}
                </Box>
                <Box sx={{flex: 'none'}}>{footerCta}</Box>
            </Box>
        </Box>
    )
}
