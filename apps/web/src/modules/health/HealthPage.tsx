'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import {useTranslations} from 'next-intl'
import type {HealthCheckResult} from '@heritagemonitor/shared'
import {Text} from '@/common/text'
import {useHealthStatus} from './hooks/useHealthStatus'

function CheckRow({check}: {check: HealthCheckResult}) {
    const t = useTranslations('Health')

    return (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
            <Chip
                label={check.name}
                color={check.status === 'ok' ? 'success' : 'error'}
                sx={{width: 110}}
            />
            <Text variant="body2" color="text.secondary">
                {t('checkStatus', {
                    message: check.message,
                    time: check.checkedAt.toLocaleTimeString(),
                })}
            </Text>
        </Box>
    )
}

export function HealthPage() {
    const t = useTranslations('Health')
    const status = useHealthStatus()

    return (
        <Box sx={{p: 4}}>
            <Text variant="h4" component="h1" gutterBottom>
                {t('title')}
            </Text>

            {status.state === 'loading' && <Chip label={t('checking')} />}
            {status.state === 'error' && (
                <Text variant="body2" color="error">
                    {t('lastAttempted', {
                        message: status.message,
                        time: status.checkedAt.toLocaleTimeString(),
                    })}
                </Text>
            )}
            {status.state === 'ok' && (
                <Stack spacing={1.5}>
                    {status.data.checks.map((check) => (
                        <CheckRow key={check.name} check={check} />
                    ))}
                </Stack>
            )}

            <Text variant="caption" color="text.secondary" sx={{display: 'block', mt: 2}}>
                {t('pollingNote', {endpoint: '/v1/health', seconds: 5})}
            </Text>
        </Box>
    )
}
