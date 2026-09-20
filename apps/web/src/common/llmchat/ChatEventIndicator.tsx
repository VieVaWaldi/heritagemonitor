'use client'

import {useEffect, useState} from 'react'
import Box from '@mui/material/Box'
import {Text} from '@/common/text'

const DOT_INTERVAL_MS = 400
const MAX_DOTS = 3

// Cycles 1..MAX_DOTS dots, wrapping back to 1 — the classic "..." loader,
// via the same setInterval-driven small-hook pattern as
// useCyclingPlaceholder rather than a CSS @keyframes animation, since the
// dot count (not just opacity) is what needs to change.
function useCyclingDots(): string {
    const [count, setCount] = useState(1)
    useEffect(() => {
        const id = setInterval(() => setCount((c) => (c % MAX_DOTS) + 1), DOT_INTERVAL_MS)
        return () => clearInterval(id)
    }, [])
    return '.'.repeat(count)
}

export interface ChatEventIndicatorProps {
    /** e.g. "Lucy is fetching a page" — the animated dots are appended. */
    message: string
}

// General-purpose status content for LlmChatBox's ChatBox `streamingIndicator`
// slot (see its usage) — swapped in for the library's own animated dots only
// while an `event` chunk is active, so it renders in the exact same trailing
// row the default indicator would (directly below the user's message, before
// the reply bubble appears), not a separately-positioned element. Not
// specific to web_fetch — reusable for any future "something is happening
// server-side" message the /v1/llmchat/stream protocol's `event` chunk
// carries (see llmchat.service.ts and adapter.ts's watchChatEvents). Same
// grey as CorpusPanel's "Corpus" label (text.disabled) so it reads as
// chrome/status, not conversation content.
export function ChatEventIndicator({message}: ChatEventIndicatorProps) {
    const dots = useCyclingDots()
    return (
        <Text variant="caption" sx={{color: 'text.disabled', width: '100%', textAlign: 'center'}}>
            {message}
            {/* Reserves width for the longest dot count so the message text
                doesn't shift horizontally as dots cycle. */}
            <Box component="span" sx={{display: 'inline-block', width: '1.5em', textAlign: 'left'}}>
                {dots}
            </Box>
        </Text>
    )
}
