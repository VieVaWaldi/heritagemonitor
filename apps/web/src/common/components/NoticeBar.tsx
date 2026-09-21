'use client'

import Box from '@mui/material/Box'
import {alpha} from '@mui/material/styles'
import type {ReactNode} from 'react'
import {Text} from '@/common/text'

/**
 * Which of the app's own palette colours a notice speaks in. Deliberately not
 * MUI's `severity`: its `info` blue exists nowhere in this product's palette
 * ("Modern Heritage": teal primary, gold secondary, crimson warning — see
 * common/theme/palette.ts), so an Alert dropped in as-is is the one blue
 * rectangle on an otherwise teal-and-gold page.
 */
export type NoticeTone = 'note' | 'warning'

const TONE_COLOR: Record<NoticeTone, 'secondary' | 'warning'> = {
    // Gold: something about the page state worth reading, not a problem.
    note: 'secondary',
    // Heritage crimson: the request could not be served as asked.
    warning: 'warning',
}

export interface NoticeBarProps {
    tone?: NoticeTone
    children: ReactNode
    /** Right-aligned action, e.g. a "Clear" button. */
    action?: ReactNode
}

/**
 * A one-line strip above a results list: why this list is what it is. Built
 * from palette tokens (`secondary.main`, `warning.main`) rather than fixed
 * colours, so it follows the theme into dark mode like everything else.
 */
export function NoticeBar({tone = 'note', children, action}: NoticeBarProps) {
    const color = TONE_COLOR[tone]

    return (
        <Box
            role="status"
            sx={(theme) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1,
                borderRadius: 1,
                border: 1,
                borderColor: alpha(theme.palette[color].main, 0.5),
                backgroundColor: alpha(theme.palette[color].main, 0.08),
                flexShrink: 0,
            })}
        >
            <Text variant="body2" sx={{flex: '1 1 auto', minWidth: 0, color: `${color}.dark`}}>
                {children}
            </Text>
            {action}
        </Box>
    )
}
