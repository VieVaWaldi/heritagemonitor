'use client'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import type {SxProps, Theme} from '@mui/material/styles'
import ClearIcon from '@mui/icons-material/DeleteOutlined'
import {ChatBox} from '@mui/x-chat'
import {useRouter} from 'next/navigation'
import {forwardRef, useCallback, useMemo, useState, type ComponentPropsWithoutRef, type MouseEvent} from 'react'
import {
    ACTION_BAR_BORDER_WIDTH,
    ACTION_BAR_BORDER_COLOR,
    ACTION_BAR_BORDER_HOVER_COLOR,
} from '@/common/components/actionBarStyle'
import {USE_CASES} from '@/common/catalog'
import {useActiveUseCase} from '@/common/hooks/useActiveUseCase'
import {Text} from '@/common/text'
import {createLlmChatAdapter} from './adapter'
import {LlmChatHeaderRight} from './LlmChatHeader'
import {usePageChatContextReader} from './PageChatContext'

export interface LlmChatBoxProps {
    sx?: SxProps<Theme>
    /** Called when the composer's clear button is pressed. The caller (see
     * LlmChatRuntime) owns actually resetting the conversation — ChatBox is
     * uncontrolled internally, so this component can't reset itself. */
    onClear?: () => void
}

const CONVERSATION_ID = 'llmchat'

// Referentially stable — passed as ChatBox's `initialConversations`, which
// (like `initialMessages` below) only matters on first mount. A literal
// recreated every render would (dev-mode only) trip @mui/x-chat's "changing
// the default state of an uncontrolled ChatProvider" warning even though the
// content never actually changes.
const INITIAL_CONVERSATIONS = [{id: CONVERSATION_ID, title: ''}]

// Composer starts at 2 rows (matches SearchBar's single-line height roughly
// doubled) and grows up to this many before it scrolls instead of the box
// growing further.
const COMPOSER_MAX_ROWS = 6

// `slots.composerRoot` swaps @mui/x-chat's own styled 'form' element
// (ChatComposerStyled in ChatComposer.js) wholesale rather than wrapping it —
// unlike composerToolbar/composerInput/etc., composerRoot is documented as
// "wrapper-only" (children still render inside), but the *base* CSS the
// library's own styled component would have applied is NOT: swapping in a
// plain Box previously lost it entirely (squished layout, no border). This
// reproduces that base CSS verbatim from the installed @mui/x-chat version
// so nothing is lost — only the compact-variant block is left out, since
// this app never sets variant="compact" here. Re-check this against
// ChatComposer.js's ChatComposerStyled if @mui/x-chat is upgraded.
function composerRootBaseSx(theme: Theme) {
    return {
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        gap: theme.spacing(0.5),
        padding: theme.spacing(1, 1.5),
        border: '1px solid',
        borderColor: theme.palette.divider,
        // A literal px string, not the bare number `theme.shape.borderRadius`
        // (8) — MUI's sx system multiplies a unitless borderRadius by
        // theme.shape.borderRadius itself (the same convention spacing
        // shorthands use), so the bare number rendered as 8 * 8 = 64px, a
        // near-pill shape instead of the 8px the source styled-component
        // actually applies (styled() interprets plain numbers as px, sx
        // doesn't — same value, different meaning in each context).
        borderRadius: `${theme.shape.borderRadius}px`,
        backgroundColor: theme.palette.background.paper,
        boxSizing: 'border-box',
        flexShrink: 0,
        margin: theme.spacing(0, 1.5, 1.5),
        transition: theme.transitions.create(['border-color', 'box-shadow'], {
            duration: theme.transitions.duration.short,
        }),
        '&:focus-within:not([data-disabled])': {
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
        },
        '&[data-disabled]': {
            backgroundColor: theme.palette.action.disabledBackground,
            opacity: theme.palette.action.disabledOpacity,
            pointerEvents: 'none',
        },
    }
}

type ComposerRootWithClearProps = ComponentPropsWithoutRef<'form'> & {sx?: SxProps<Theme>}

// A factory (not a component defined inline in render) so the slot's
// identity only changes when `onClear` itself does — `onClear` is a stable
// useCallback from LlmChatRuntime, so in practice this is created once and
// never causes the composer subtree to remount.
function createComposerRootWithClear(onClear: () => void) {
    return forwardRef<HTMLFormElement, ComposerRootWithClearProps>(function ComposerRootWithClear(
        {children, sx, ...rest},
        ref,
    ) {
        // useSlotProps (internal to @mui/x-chat-headless's <ComposerRoot>)
        // forwards its computed `ownerState` straight through to whatever
        // element this slot renders, same as it would to the library's own
        // default styled 'form' — which quietly consumes it. Box doesn't, so
        // it leaks onto the DOM <form> node as an invalid attribute unless
        // dropped here explicitly.
        const {ownerState: _ownerState, ...rootProps} = rest as ComposerRootWithClearProps & {ownerState?: unknown}
        return (
            <Box
                component="form"
                ref={ref}
                {...rootProps}
                sx={[composerRootBaseSx, ...(Array.isArray(sx) ? sx : [sx])]}
            >
                {children}
                {/* Positioned like a toolbar item at the form's own
                    bottom-left padding edge — the send button sits
                    symmetrically at the bottom-right, inset by the toolbar
                    row's own height from the form's bottom padding, which is
                    exactly what this matches since both this button and the
                    toolbar are 30px tall. Left of the send button, on the
                    same row — the toolbar's own left side is otherwise empty
                    since attachments are disabled
                    (features.attachments: false). type="button" so this
                    can't be mistaken for the composer's own submit. */}
                <IconButton
                    type="button"
                    onClick={onClear}
                    aria-label="Clear chat"
                    size="small"
                    sx={{position: 'absolute', left: 12, bottom: 8, width: 30, height: 30}}
                >
                    <ClearIcon fontSize="small" />
                </IconButton>
            </Box>
        )
    })
}

// Wraps @mui/x-chat's <ChatBox> (see apps/web/RULES.md rule 4, wrap external
// components). No border/card chrome of its own — LlmChatRuntime owns that
// for the docked/overlay singleton, the demo page supplies its own — the
// disclaimer footer lives here, outside
// ChatBox's own composer, rather than inside it (ChatBox's composerHelperText
// slot renders directly under the input, which read as part of where you
// type). ChatBox itself picks up the app's MUI theme (palette, typography,
// radii, dark mode) automatically since it's a native MUI component rendered
// inside the app's existing ThemeModeProvider. The slots/slotProps passed to
// it restyle its composer/message chrome to match the rest of the app
// (ActionBar's border treatment, no bubble timestamps, background.paper
// instead of ChatBox's own default background.default so it reads as part of
// the page rather than a distinct surface) — none of this drops down to
// @mui/x-chat-headless, which its own README marks as an internal, unstable
// implementation detail not meant for direct use.
export function LlmChatBox({sx, onClear}: LlmChatBoxProps) {
    // useMemo, not a fresh adapter per render: createAiSdkAdapter closes over
    // a per-call synthetic-message-id counter that should live for the
    // component's lifetime, not reset on every re-render. getPageContext's
    // identity is stable (see usePageChatContextReader), so this still only
    // constructs the adapter once despite depending on it.
    const getPageContext = usePageChatContextReader()
    const adapter = useMemo(() => createLlmChatAdapter(getPageContext), [getPageContext])

    // Reuses the same route -> UseCase/SubUseCase matching HMMenu's selection
    // state is built on (see useActiveUseCase) instead of re-deriving it —
    // "landing page" is the fallback for routes that don't match any
    // UseCase, e.g. '/' itself or this very demo page.
    const {useCaseKey, subUseCaseKey} = useActiveUseCase()

    // Lazy useState, not useMemo(deps): this component is now a singleton
    // that outlives any single page (see LlmChatRuntime), so useCaseKey
    // changes on every navigation — but the welcome message below must only
    // ever reflect whichever page was current at the chat's first mount.
    // Recomputing it on navigation would (a) be a lie ("we are on X") once
    // the user's since read replies about page Y, and (b) change the
    // `initialMessages` prop's content after ChatBox has already initialized
    // from it, which is exactly the "changing the default state of an
    // uncontrolled ChatProvider" case @mui/x-chat warns about.
    const [pageName] = useState(() => {
        const useCase = USE_CASES.find((uc) => uc.key === useCaseKey)
        if (!useCase) return 'landing page'
        const subUseCase = useCase.subUseCases?.find((sub) => sub.key === subUseCaseKey)
        return subUseCase?.name ?? useCase.name
    })

    // Memoized for the same reason as INITIAL_CONVERSATIONS above — pageName
    // is frozen at mount (see above), so this now computes once and never
    // changes identity afterwards.
    const initialMessages = useMemo(
        () => [
            {
                id: 'welcome',
                conversationId: CONVERSATION_ID,
                role: 'assistant' as const,
                status: 'sent' as const,
                parts: [{type: 'text' as const, text: `Welcome to HeritageMonitor, we are on ${pageName}.`}],
            },
        ],
        [pageName],
    )

    // undefined (not a no-op) when onClear isn't passed — e.g. the demo page
    // mounts LlmChatBox standalone with nothing to reset — so slots.composerRoot
    // below falls back to @mui/x-chat's own default styled root instead of
    // rendering a clear button that does nothing.
    const ComposerRootWithClear = useMemo(() => (onClear ? createComposerRootWithClear(onClear) : undefined), [onClear])

    // Markdown links in Lucy's replies render via @mui/x-chat's own built-in
    // renderer (MarkdownLink in renderMarkdown.js, not something this module
    // has a supported hook into — see the module comment above on why this
    // file avoids @mui/x-chat-headless internals), which hardcodes
    // target="_blank" — every link opens a new, separate tab with its own
    // fresh chat instance instead of the one the user was just talking to.
    // Intercepting the click here (delegated, since the anchors themselves
    // aren't ours to attach a handler to) and navigating this tab instead —
    // via next/navigation's router for an in-app link, so the singleton chat
    // (see LlmChatRuntime) survives it same as any other in-app navigation —
    // is the one thing this component *can* control without needing
    // @mui/x-chat to expose link behavior as a prop.
    const router = useRouter()
    const handleContentClick = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            // Middle-click, and ctrl/cmd/shift/alt-click, are the standard
            // browser gestures for "open in a new tab/window regardless of
            // what the link normally does" — respect that intent instead of
            // forcing every click to stay in this tab.
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            const anchor = (event.target as HTMLElement).closest('a')
            const href = anchor?.getAttribute('href')
            if (!href) return
            event.preventDefault()
            const url = new URL(href, window.location.origin)
            if (url.origin === window.location.origin) {
                router.push(`${url.pathname}${url.search}${url.hash}`)
            } else {
                window.location.assign(href)
            }
        },
        [router],
    )

    return (
        <Box
            // Delegated from here rather than on the message list specifically
            // — links only ever appear inside message bubbles, and clicks on
            // everything else (composer, clear button, header) never match a
            // closest('a') so they're unaffected.
            onClick={handleContentClick}
            sx={[
                {
                    display: 'flex',
                    flexDirection: 'column',
                    // Matches HeroLayout's root background — same page-background
                    // feel as the rest of the hero rather than a separate card.
                    backgroundColor: 'background.paper',
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
        >
            <ChatBox
                adapter={adapter}
                // Empty title: keeps the header bar (so the layout doesn't jump)
                // but renders nothing in it.
                initialConversations={INITIAL_CONVERSATIONS}
                initialActiveConversationId={CONVERSATION_ID}
                initialMessages={initialMessages}
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
                    // Repurposes the (now-empty-titled) header's actions slot for
                    // the "Lucy" title/icon instead of the default title/subtitle.
                    conversationHeaderActions: LlmChatHeaderRight,
                    ...(ComposerRootWithClear ? {composerRoot: ComposerRootWithClear} : {}),
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
                    // ChatMessageList defaults to background.default — override
                    // so the message area reads as flat page background too.
                    messageList: {
                        sx: {backgroundColor: 'background.paper'},
                    },
                }}
                sx={{flex: 1, minHeight: 0, backgroundColor: 'background.paper'}}
            />
            <Text variant="caption" sx={{color: 'text.disabled', px: 1.5, py: 1}}>
                Lucy is AI and can make mistakes. Please double-check responses.
            </Text>
        </Box>
    )
}
