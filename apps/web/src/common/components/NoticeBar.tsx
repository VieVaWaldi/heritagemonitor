'use client'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import {alpha} from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react'
import {Text} from '@/common/text'
import {NOTICE_AUTO_DISMISS_MS, noticeKey} from './noticeKey'

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
    /** Tighter padding and smaller text, for a strip inside a panel rather than above one. */
    compact?: boolean
    /** Called when the notice goes away, by its close button or by the timer. */
    onDismiss?: () => void
}

/**
 * A one-line strip above a results list: why this list is what it is. Built
 * from palette tokens (`secondary.main`, `warning.main`) rather than fixed
 * colours, so it follows the theme into dark mode like everything else.
 */
export function NoticeBar({tone = 'note', children, action, compact = false, onDismiss}: NoticeBarProps) {
    const color = TONE_COLOR[tone]

    // Gold notices explain the page state and dismiss themselves after
    // NOTICE_AUTO_DISMISS_MS, or with the close button. A warning is a
    // problem, not commentary, so it stays until the cause is gone.
    //
    // Dismissed per CONTENT: the notice remembers which text it was dismissed
    // as, so a caption or state that changes shows again (and restarts the
    // clock) instead of staying gone.
    const key = noticeKey(tone, children)
    const dismissible = tone === 'note'
    const [dismissedKey, setDismissedKey] = useState<string | null>(null)
    // A ref, so an inline `onDismiss` from a re-rendering parent does not
    // restart the timer on every render.
    const onDismissRef = useRef(onDismiss)
    useEffect(() => {
        onDismissRef.current = onDismiss
    })
    const dismiss = useCallback(() => {
        setDismissedKey(key)
        onDismissRef.current?.()
    }, [key])
    useEffect(() => {
        if (!dismissible) return
        const timer = setTimeout(dismiss, NOTICE_AUTO_DISMISS_MS)
        return () => clearTimeout(timer)
    }, [dismissible, dismiss])

    if (dismissible && dismissedKey === key) return null

    return (
        <Box
            role="status"
            sx={(theme) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: compact ? 0.5 : 1,
                borderRadius: 1,
                border: 1,
                borderColor: alpha(theme.palette[color].main, 0.5),
                backgroundColor: alpha(theme.palette[color].main, 0.08),
                flexShrink: 0,
            })}
        >
            <Text variant={compact ? 'caption' : 'body2'} sx={{flex: '1 1 auto', minWidth: 0, color: `${color}.dark`}}>
                {children}
            </Text>
            {action}
            {dismissible && (
                <IconButton size="small" onClick={dismiss} aria-label="Dismiss notice" sx={{color: `${color}.dark`, flexShrink: 0, p: 0.25}}>
                    <CloseIcon fontSize="inherit" />
                </IconButton>
            )}
        </Box>
    )
}
