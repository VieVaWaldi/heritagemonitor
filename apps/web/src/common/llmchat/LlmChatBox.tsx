'use client'

import Box from '@mui/material/Box'
import type {SxProps, Theme} from '@mui/material/styles'
import {ChatBox} from '@mui/x-chat'
import {useMemo} from 'react'
import {
    ACTION_BAR_BORDER_WIDTH,
    ACTION_BAR_BORDER_COLOR,
    ACTION_BAR_BORDER_HOVER_COLOR,
} from '@/common/components/actionBarStyle'
import {USE_CASES} from '@/common/catalog'
import {useActiveUseCase} from '@/common/hooks/useActiveUseCase'
import {Text} from '@/common/text'
import {createLlmChatAdapter} from './adapter'
import {LlmChatHeaderLeft, LlmChatHeaderRight} from './LlmChatHeader'

export interface LlmChatBoxProps {
    sx?: SxProps<Theme>
}

const CONVERSATION_ID = 'llmchat'

// Composer starts at 2 rows (matches SearchBar's single-line height roughly
// doubled) and grows up to this many before it scrolls instead of the box
// growing further.
const COMPOSER_MAX_ROWS = 6

// Wraps @mui/x-chat's <ChatBox> (see apps/web/RULES.md rule 4, wrap external
// components) in the bordered card the whole chat feature reads as — the
// disclaimer footer lives here, outside ChatBox's own composer, rather than
// inside it (ChatBox's composerHelperText slot renders directly under the
// input, which read as part of where you type). ChatBox itself picks up the
// app's MUI theme (palette, typography, radii, dark mode) automatically
// since it's a native MUI component rendered inside the app's existing
// ThemeModeProvider. The slots/slotProps passed to it only restyle its own
// composer/message chrome to match the rest of the app (ActionBar's border
// treatment, no bubble timestamps) — none of this drops down to
// @mui/x-chat-headless, which its own README marks as an internal, unstable
// implementation detail not meant for direct use.
export function LlmChatBox({sx}: LlmChatBoxProps) {
    // useMemo, not a fresh adapter per render: createAiSdkAdapter closes over
    // a per-call synthetic-message-id counter that should live for the
    // component's lifetime, not reset on every re-render.
    const adapter = useMemo(() => createLlmChatAdapter(), [])

    // Reuses the same route -> UseCase/SubUseCase matching HMMenu's selection
    // state is built on (see useActiveUseCase) instead of re-deriving it —
    // "landing page" is the fallback for routes that don't match any
    // UseCase, e.g. '/' itself or this very demo page.
    const {useCaseKey, subUseCaseKey} = useActiveUseCase()
    const pageName = useMemo(() => {
        const useCase = USE_CASES.find((uc) => uc.key === useCaseKey)
        if (!useCase) return 'landing page'
        const subUseCase = useCase.subUseCases?.find((sub) => sub.key === subUseCaseKey)
        return subUseCase?.name ?? useCase.name
    }, [useCaseKey, subUseCaseKey])

    return (
        <Box
            sx={[
                {
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
        >
            <ChatBox
                adapter={adapter}
                // Empty title: keeps the header bar (so the layout doesn't jump)
                // but renders nothing in it.
                initialConversations={[{id: CONVERSATION_ID, title: ''}]}
                initialActiveConversationId={CONVERSATION_ID}
                initialMessages={[
                    {
                        id: 'welcome',
                        conversationId: CONVERSATION_ID,
                        role: 'assistant',
                        status: 'sent',
                        parts: [{type: 'text', text: `Welcome to HeritageMonitor, we are on ${pageName}.`}],
                    },
                ]}
                features={{attachments: false}}
                slots={{
                    // No per-bubble timestamp in either layout variant.
                    messageInlineMeta: null,
                    messageMeta: null,
                    // No "User"/"Assistant" author label above each bubble.
                    messageAuthorName: null,
                    // No avatar at all — null (not just an empty component) is
                    // what makes @mui/x-chat collapse the reserved avatar column
                    // (its "noAvatar" layout), so bubbles hug their own side
                    // instead of leaving a gap where the icon used to be.
                    messageAvatar: null,
                    // Repurposes the (now-empty-titled) header's left/right slots
                    // instead of the default title/subtitle + actions.
                    conversationHeaderInfo: LlmChatHeaderLeft,
                    conversationHeaderActions: LlmChatHeaderRight,
                }}
                slotProps={{
                    // Same border treatment as ActionBar's SearchBar instead of
                    // ChatBox's default divider-colored composer border.
                    composerRoot: {
                        sx: {
                            borderWidth: ACTION_BAR_BORDER_WIDTH,
                            borderColor: ACTION_BAR_BORDER_COLOR,
                            '&:focus-within:not([data-disabled])': {
                                borderColor: ACTION_BAR_BORDER_HOVER_COLOR,
                                boxShadow: 'none',
                            },
                        },
                    },
                    composerInput: {
                        maxRows: COMPOSER_MAX_ROWS,
                        slotProps: {input: {rows: 2}},
                    },
                    // Default send button is already primary-colored and
                    // right-aligned (ChatComposer's toolbar) — just sized down.
                    composerSendButton: {
                        sx: {width: 30, height: 30, fontSize: '1.05rem'},
                    },
                }}
                sx={{flex: 1, minHeight: 0}}
            />
            <Text variant="caption" sx={{color: 'text.disabled', px: 1.5, py: 1}}>
                Lucy is AI and can make mistakes. Please double-check responses.
            </Text>
        </Box>
    )
}
