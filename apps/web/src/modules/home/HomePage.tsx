'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import {useTranslations} from 'next-intl'
import {Text} from '@/common/text'

export function HomePage() {
    const t = useTranslations('Home')

    return (
        <Box
            sx={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                px: 4,
                py: 8,
            }}
        >
            <Text variant="h1" component="h1" sx={{mb: 2}}>
                {t('title')}
            </Text>
            <Text variant="h5" component="p" color="text.secondary" sx={{mb: 3, maxWidth: 640}}>
                {t('tagline')}
            </Text>
            <Text variant="body1" color="text.secondary" sx={{mb: 4, maxWidth: 640}}>
                {t('description')}
            </Text>
            <Chip label={t('statusLabel')} color="success" variant="outlined" />
        </Box>
    )
}
