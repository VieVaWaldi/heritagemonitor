'use client'

import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import {Text} from '@/common/text'

export interface LanguageSelectionProps {
    onClick?: () => void
}

// Placeholder global language switch. No dropdown logic yet — the app is
// single-locale (no [locale] route segment / middleware), see
// apps/web/src/common/i18n/request.ts.
export function LanguageSelection({onClick}: LanguageSelectionProps) {
    return (
        <Button
            onClick={onClick}
            variant="outlined"
            sx={{
                borderRadius: 1,
                borderColor: 'divider',
                color: 'text.primary',
                gap: 1,
                px: 1.5,
            }}
        >
            <Box component="span" sx={{fontSize: 18, lineHeight: 1}}>
                🌐
            </Box>
            <Text variant="button">EN</Text>
        </Button>
    )
}
