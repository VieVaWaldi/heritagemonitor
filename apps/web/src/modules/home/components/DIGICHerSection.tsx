import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import {useTranslations} from 'next-intl'
import {Text} from '@/common/text'

const DIGICHER_URL = 'https://www.digicher-project.eu/'

// Sits right after HeroPage (which renders LogoBanner right below its own
// scrollHint/footerCta). Static content, no hooks — same reasoning as
// InformationSection for not forcing a client boundary.
export function DIGICHerSection() {
    const t = useTranslations('Home.digicher')

    return (
        <Box component="section" sx={{backgroundColor: 'background.paper'}}>
            <Box sx={{maxWidth: 760, mx: 'auto', textAlign: 'center', px: {xs: 3, md: 4}, pt: 10, pb: 6}}>
                <Text
                    variant="overline"
                    component="h2"
                    sx={{fontWeight: 700, display: 'block', color: 'primary.main', mb: 2}}
                >
                    {t('title')}
                </Text>
                <Text variant="body1" color="text.secondary" sx={{lineHeight: 1.7, mb: 4}}>
                    {t('body')}
                </Text>
                <Button
                    href={DIGICHER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    color="primary"
                    endIcon={<ArrowForwardIcon />}
                >
                    {t('cta')}
                </Button>
            </Box>
        </Box>
    )
}
