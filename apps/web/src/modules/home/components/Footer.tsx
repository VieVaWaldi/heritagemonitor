import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import {useTranslations} from 'next-intl'
import {Text} from '@/common/text'
import {ThemedLogoImage} from './ThemedLogoImage'

const DEPARTMENT_URL = 'https://www.gw.uni-jena.de/en/8465/juniorprofessur-fuer-digital-humanities'
const GITHUB_URL = 'https://github.com/vievawaldi'
const DEVELOPER_URL = 'https://walterai.co/'

const linkButtonSx = {
    color: 'text.secondary',
    borderColor: 'divider',
    '&:hover': {borderColor: 'primary.main', color: 'primary.main'},
}

export function Footer() {
    const t = useTranslations('Home.footer')

    return (
        <Box
            component="footer"
            sx={{borderTop: 1, borderColor: 'divider', backgroundColor: 'background.paper', px: {xs: 3, md: 4}, py: 8}}
        >
            <Box sx={{maxWidth: 1200, mx: 'auto'}}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {xs: '1fr', md: '1fr 1fr'},
                        columnGap: 6,
                        rowGap: 6,
                        mb: 6,
                    }}
                >
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
                        <Text variant="h6" sx={{fontWeight: 600, color: 'primary.main'}}>
                            {t('department.name')}
                        </Text>
                        <Text variant="body2" color="text.secondary" sx={{lineHeight: 1.7}}>
                            {t('department.description')}
                        </Text>
                        <Button
                            href={DEPARTMENT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            color="primary"
                            endIcon={<ArrowForwardIcon/>}
                            sx={{width: 'fit-content'}}
                        >
                            {t('department.cta')}
                        </Button>
                    </Box>

                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
                        <Text variant="h6" sx={{fontWeight: 600, color: 'primary.main'}}>
                            {t('contact.title')}
                        </Text>
                        <Box>
                            <Text variant="body2" color="text.secondary">
                                {t('contact.lead')}
                            </Text>
                            <Text variant="body2" color="text.secondary">
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

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        borderTop: 1,
                        borderColor: 'divider',
                        pt: 6,
                    }}
                >
                    <Box sx={{position: 'relative', height: 64, width: 160}}>
                        <ThemedLogoImage
                            src="/images/logos/eu-logo.jpg"
                            darkSrc="/images/logos/eu-logo-dark.png"
                            alt="EU Funded - DigiCHer Logo"
                            fill
                            sizes="160px"
                            style={{objectFit: 'contain'}}
                        />
                    </Box>
                    <Box sx={{textAlign: 'center'}}>
                        <Text variant="body2" color="text.secondary" sx={{mb: 1}}>
                            {t('funding')}
                        </Text>
                        <Text variant="caption" color="text.disabled">
                            {t('copyright', {year: new Date().getFullYear()})}
                        </Text>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
