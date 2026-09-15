'use client'

import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import {Text} from '@/common/text'

export interface LanguageSelectionProps {
    onClick?: () => void
    // true renders just the globe glyph with no border/background/label —
    // for use inside a panel that already supplies its own shared
    // background (see CorpusPanel).
    iconOnly?: boolean
}

// Placeholder global language switch. No dropdown logic yet — the app is
// single-locale (no [locale] route segment / middleware), see
// apps/web/src/common/i18n/request.ts.
export function LanguageSelection({onClick, iconOnly}: LanguageSelectionProps) {
    if (iconOnly) {
        return (
            <IconButton onClick={onClick} aria-label="change language">
                <Box component="span" sx={{fontSize: 18, lineHeight: 1}}>
                    🌐
                </Box>
            </IconButton>
        )
    }

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
