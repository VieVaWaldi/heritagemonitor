import Box from '@mui/material/Box'
import {useTranslations} from 'next-intl'
import {Text} from '@/common/text'

interface InfoEntry {
    title: string
    content: string
}

export function InformationSection() {
    const t = useTranslations('Home.information')
    const sections = t.raw('sections') as InfoEntry[]

    return (
        <Box component="section" sx={{backgroundColor: 'background.default', pt: 12, pb: 4, px: {xs: 3, md: 4}}}>
            <Box sx={{maxWidth: 960, mx: 'auto', mb: 10}}>
                <Text
                    variant="overline"
                    component="h2"
                    sx={{fontWeight: 700, display: 'block', textAlign: 'center', mb: 6}}
                >
                    {t('title')}
                </Text>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {xs: '1fr', md: '1fr 1fr'},
                        columnGap: 6,
                        rowGap: 4,
                    }}
                >
                    {sections.map((section) => (
                        <Box key={section.title}>
                            <Text variant="subtitle1" sx={{fontWeight: 600, mb: 1}}>
                                {section.title}
                            </Text>
                            <Text variant="body2" color="text.secondary">
                                {section.content}
                            </Text>
                        </Box>
                    ))}
                </Box>
            </Box>

            <Text variant="body2" color="text.secondary" sx={{textAlign: 'center', mb: 4}}>
                {t('fundedLine')}
            </Text>
        </Box>
    )
}
