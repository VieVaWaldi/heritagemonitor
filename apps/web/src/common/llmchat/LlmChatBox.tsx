'use client'

import type {SxProps, Theme} from '@mui/material/styles'
import {ChatBox} from '@mui/x-chat'
import {useMemo} from 'react'
import {createLlmChatAdapter} from './adapter'

export interface LlmChatBoxProps {
    sx?: SxProps<Theme>
}

const CONVERSATION_ID = 'llmchat'

// Thin wrapper around @mui/x-chat's <ChatBox> (see apps/web/RULES.md rule 4,
// wrap external components) — picks up the app's MUI theme (palette,
// typography, radii, dark mode) automatically since ChatBox is a native MUI
// component rendered inside the app's existing ThemeModeProvider.
export function LlmChatBox({sx}: LlmChatBoxProps) {
    // useMemo, not a fresh adapter per render: createAiSdkAdapter closes over
    // a per-call synthetic-message-id counter that should live for the
    // component's lifetime, not reset on every re-render.
    const adapter = useMemo(() => createLlmChatAdapter(), [])

    return (
        <ChatBox
            adapter={adapter}
            initialConversations={[{id: CONVERSATION_ID, title: 'HeritageMonitor Assistant'}]}
            initialActiveConversationId={CONVERSATION_ID}
            initialMessages={[
                {
                    id: 'welcome',
                    conversationId: CONVERSATION_ID,
                    role: 'assistant',
                    status: 'sent',
                    parts: [{type: 'text', text: 'Ask me anything.'}],
                },
            ]}
            sx={sx}
        />
    )
}
