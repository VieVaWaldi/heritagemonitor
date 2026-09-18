'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from 'next/link'
import {useTranslations} from 'next-intl'
import {Navbar, NAVBAR_HEIGHT} from '@/common/components'
import {Text} from '@/common/text'

export function NotFoundPage() {
    const t = useTranslations('NotFound')

    return (
        <>
            <Navbar />
            <Box
                sx={{
                    minHeight: `calc(100dvh - ${NAVBAR_HEIGHT}px)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    px: 3,
                    textAlign: 'center',
                }}
            >
                <Text variant="h1" component="h1">
                    {t('title')}
                </Text>
                <Text variant="h4" color="text.secondary">
                    {t('message')}
                </Text>
                <Box
                    component="video"
                    src="/mp4/notFound/youLost.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    sx={{width: '100%', maxWidth: 360, borderRadius: 2}}
                />
                <Button variant="contained" component={Link} href="/" sx={{mt: 2}}>
                    {t('backHome')}
                </Button>
            </Box>
        </>
    )
}
