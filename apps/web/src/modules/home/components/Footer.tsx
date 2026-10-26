import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import Image from 'next/image'
import {useTranslations} from 'next-intl'
import {Text} from '@/common/text'

const DEPARTMENT_URL = 'https://www.gw.uni-jena.de/en/8465/juniorprofessur-fuer-digital-humanities'
const GITHUB_URL = 'https://github.com/vievawaldi'
const DEVELOPER_URL = 'https://walterai.co/'

// The whole footer sits on DIGICHer's own orange, entering on a straight
// edge and cut by a wavy bottom — digicher-project.eu closes the same way,
// on a band in this palette (see git history for how these values were
// sampled from their site, since the original is a live WebGL background,
// not a static asset to reuse). Fixed colors, not theme tokens: this band
// is DIGICHer's palette, not HM's, and stays the same in light or dark
// mode — only the wave's cutout has to match whatever real page background
// sits below it (background.default; this is the last thing on the page).
const GRADIENT = 'linear-gradient(135deg, #EE9447 0%, #F0A25C 45%, #F1C298 100%)'
const STROKE_COLOR = '#FF8117' // DIGICHer's brand orange, sampled from the logo file
const TEXT_DARK = 'rgba(20, 12, 4, 0.87)'
const TEXT_DARK_SECONDARY = 'rgba(20, 12, 4, 0.65)'
const WAVE_HEIGHT = {xs: 40, sm: 56, md: 72}

// One gentle two-hump wave, wide enough to look natural stretched across
// any viewport (preserveAspectRatio="none" below does the stretching).
const WAVE_CURVE = 'M0,50 C240,10 480,90 720,50 C960,10 1200,90 1440,50'
// Same curve, closed back down along the bottom edge — background.default
// fills everything below it, cutting into the gradient box from the bottom.
const WAVE_FILL = `${WAVE_CURVE} L1440,100 L0,100 Z`

const linkButtonSx = {
    color: TEXT_DARK,
    borderColor: 'rgba(20, 12, 4, 0.35)',
    '&:hover': {borderColor: TEXT_DARK, backgroundColor: 'rgba(255, 255, 255, 0.3)'},
}

export function Footer() {
    const t = useTranslations('Home.footer')

    return (
        <Box component="footer" sx={{position: 'relative', overflow: 'hidden', background: GRADIENT}}>
            {/* The cut: a path filled with the page background sitting over the
                gradient, plus the same path stroked in brand orange tracing the
                cut's edge — same two-layer trick DIGICHer's own divider uses. */}
            <Box
                component="svg"
                viewBox="0 0 1440 100"
                preserveAspectRatio="none"
                aria-hidden
                sx={{position: 'absolute', bottom: -1, left: 0, width: '100%', height: WAVE_HEIGHT, display: 'block'}}
            >
                <Box component="path" d={WAVE_FILL} sx={{fill: (theme) => theme.palette.background.default}} />
                <path d={WAVE_CURVE} fill="none" stroke={STROKE_COLOR} strokeWidth={5} />
            </Box>

            <Box sx={{maxWidth: 1200, mx: 'auto', px: {xs: 3, md: 4}, pt: 8, pb: {xs: 9, md: 11}}}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {xs: '1fr', md: '1fr 1fr'},
                        columnGap: 6,
                        rowGap: 6,
                        mb: 8,
                    }}
                >
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
                        <Text variant="h6" sx={{fontWeight: 600, color: TEXT_DARK}}>
                            {t('department.name')}
                        </Text>
                        <Text variant="body2" sx={{lineHeight: 1.7, color: TEXT_DARK_SECONDARY}}>
                            {t('department.description')}
                        </Text>
                        <Button
                            href={DEPARTMENT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            endIcon={<ArrowForwardIcon/>}
                            sx={{...linkButtonSx, width: 'fit-content'}}
                        >
                            {t('department.cta')}
                        </Button>
                    </Box>

                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
                        <Text variant="h6" sx={{fontWeight: 600, color: TEXT_DARK}}>
                            {t('contact.title')}
                        </Text>
                        <Box>
                            <Text variant="body2" sx={{color: TEXT_DARK_SECONDARY}}>
                                {t('contact.lead')}
                            </Text>
                            <Text variant="body2" sx={{color: TEXT_DARK_SECONDARY}}>
                                {t('contact.developer')}
                            </Text>
                        </Box>
                        <Box sx={{display: 'flex', gap: 2, flexWrap: 'wrap'}}>
                            <Button
                                href={GITHUB_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="outlined"
                                startIcon={<GitHubIcon/>}
                                sx={linkButtonSx}
                            >
                                {t('contact.github')}
                            </Button>
                            <Button
                                href={DEVELOPER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="outlined"
                                startIcon={<LanguageIcon/>}
                                sx={linkButtonSx}
                            >
                                {t('contact.developerWebsite')}
                            </Button>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3}}>
                    <Box sx={{position: 'relative', height: 64, width: 160, backgroundColor: '#fff', borderRadius: 1, p: 1}}>
                        <Image src="/images/logos/eu-logo.jpg" alt="Funded by the European Union" fill sizes="160px" style={{objectFit: 'contain'}} />
                    </Box>
                    <Box sx={{textAlign: 'center'}}>
                        <Text variant="body2" sx={{color: TEXT_DARK, mb: 1}}>
                            {t('funding')}
                        </Text>
                        <Text variant="caption" sx={{color: TEXT_DARK_SECONDARY}}>
                            {t('copyright', {year: new Date().getFullYear()})}
                        </Text>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
