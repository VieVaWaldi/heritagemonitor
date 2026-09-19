'use client'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react'
import {NAVBAR_BORDER_COLOR} from '@/common/components'
import {useIsMobile} from '@/common/hooks/useIsMobile'
import {LlmChatBox} from './LlmChatBox'

// Fluid width shared by the desktop-docked panel and (mirrored) by
// HomePage/UseCaseSearchPage's content-margin, so the content column always
// leaves exactly enough room for the panel to sit beside it.
export const LLM_CHAT_PANEL_WIDTH = 'clamp(280px, 20vw, 420px)'

interface LlmChatRuntimeValue {
    open: boolean
    toggle: () => void
    topOffset: number
    setTopOffset: (px: number) => void
}

const LlmChatRuntimeContext = createContext<LlmChatRuntimeValue | null>(null)

function useLlmChatRuntime(): LlmChatRuntimeValue {
    const context = useContext(LlmChatRuntimeContext)
    if (!context) throw new Error('useLlmChatRuntime must be used within a LlmChatRuntimeProvider')
    return context
}

// Open/close state for the nav toggle button (see LlmChatNavToggle).
export function useLlmChatToggle(): {open: boolean; toggle: () => void} {
    const {open, toggle} = useLlmChatRuntime()
    return {open, toggle}
}

// Each page publishes its own Navbar height (NAVBAR_HEIGHT_MID / _TALL) so
// the one shared panel instance docks directly under whichever Navbar the
// current route is showing — same publisher pattern as
// PageChatContextPublisher. Cleared back to 0 on unmount so a page that
// forgets to call this doesn't leave a stale offset behind for the next one.
export function useLlmChatTopOffset(px: number): void {
    const {setTopOffset} = useLlmChatRuntime()
    useEffect(() => {
        setTopOffset(px)
        return () => setTopOffset(0)
    }, [px, setTopOffset])
}

// sx for the page's own content column so it leaves room for the docked
// panel instead of the (now fixed-position, not flex-sibling) panel
// overlapping it. No-op on mobile, where the panel is a full-screen overlay
// instead of something content needs to make room for.
export function useLlmChatContentSx(): {marginRight: string | number} {
    const {open} = useLlmChatRuntime()
    const isMobile = useIsMobile()
    return {marginRight: open && !isMobile ? LLM_CHAT_PANEL_WIDTH : 0}
}

// Mounted once in app/layout.tsx (see PageChatContextProvider for the same
// pattern) so the single <LlmChatBox> instance below never unmounts on
// client-side navigation — the conversation simply keeps existing instead of
// needing to be saved/restored. `resetKey` gives the composer's clear
// button (see LlmChatBox) an explicit way to reset it back to just the
// welcome message: ChatBox is uncontrolled internally (see adapter.ts's own
// comment on why this module doesn't reach into @mui/x-chat-headless), so a
// full remount via `key` is the supported way to reset it.
export function LlmChatRuntimeProvider({children}: {children: ReactNode}) {
    const [open, setOpen] = useState(false)
    const [topOffset, setTopOffset] = useState(0)
    const [resetKey, setResetKey] = useState(0)
    const isMobile = useIsMobile()

    const toggle = useCallback(() => setOpen((current) => !current), [])
    const clear = useCallback(() => setResetKey((key) => key + 1), [])

    const runtimeValue = useMemo<LlmChatRuntimeValue>(
        () => ({open, toggle, topOffset, setTopOffset}),
        [open, toggle, topOffset],
    )

    // One <Box> and one <LlmChatBox> call site regardless of isMobile — not
    // two separate mobile/desktop JSX branches each with their own
    // <LlmChatBox> — so flipping isMobile (resizing across the breakpoint,
    // or the SSR-vs-hydration mismatch useMediaQuery can momentarily produce
    // on first paint) only changes props on the same elements instead of
    // swapping in a structurally different subtree. React only preserves a
    // component's state (here, the whole conversation) across a re-render
    // when it's the same element type at the same position in its parent's
    // children — two separate branches would each mount their own
    // <LlmChatBox> and lose this one's state the moment isMobile changed.
    return (
        <LlmChatRuntimeContext.Provider value={runtimeValue}>
            {children}

            <Box
                sx={
                    isMobile
                        ? {
                              // Full-screen overlay, same "fixed + inset:0 +
                              // zIndex.drawer" recipe as HMMenu/SideMenu —
                              // covers everything (including the page's own
                              // Navbar) rather than docking beside content.
                              position: 'fixed',
                              inset: 0,
                              zIndex: (theme) => theme.zIndex.drawer,
                              display: open ? 'flex' : 'none',
                              flexDirection: 'column',
                              backgroundColor: 'background.paper',
                          }
                        : {
                              // Fixed (not sticky-in-a-flex-row) so this can
                              // live outside every page's own DOM tree
                              // without needing each page to render a flex
                              // sibling for it — useLlmChatContentSx gives
                              // page content a matching margin-right
                              // instead, so the visual result (content
                              // narrows, panel docks flush right below the
                              // Navbar) is unchanged from before this moved
                              // here.
                              position: 'fixed',
                              top: topOffset,
                              right: 0,
                              bottom: 0,
                              width: LLM_CHAT_PANEL_WIDTH,
                              display: open ? 'block' : 'none',
                              border: '1px solid',
                              borderTop: 'none',
                              borderColor: NAVBAR_BORDER_COLOR,
                              overflow: 'hidden',
                              // One below appBar, not appBar itself: Navbar
                              // and SearchBar's suggestions dropdown (see
                              // Navbar.tsx, SearchBar.tsx) both sit at
                              // exactly theme.zIndex.appBar, so this stays
                              // beneath both rather than the panel
                              // (irrelevantly, since top: topOffset already
                              // keeps it clear of the Navbar) covering a
                              // dropdown that happens to render near it.
                              zIndex: (theme) => theme.zIndex.appBar - 1,
                          }
                }
            >
                {/* Mobile only — covers the nav toggle that would otherwise
                    close this, so it needs its own close affordance.
                    top-left, not top-right: the header's own "Lucy" + icon
                    (see LlmChatHeaderRight) is pushed to the far right of
                    that same row, so a right-aligned close button would sit
                    on top of it. */}
                {isMobile && (
                    <IconButton
                        onClick={toggle}
                        aria-label="close Lucy chat"
                        size="small"
                        sx={{position: 'absolute', top: 8, left: 8, zIndex: 1}}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )}
                {/* display:'none' on the wrapper above (not conditionally
                    rendering this) while closed keeps this instance
                    permanently mounted whether open or not — that, plus
                    this being the one and only call site regardless of
                    isMobile, is what makes the conversation survive both
                    navigation and breakpoint changes. */}
                <LlmChatBox key={resetKey} onClear={clear} sx={isMobile ? {flex: 1, minHeight: 0} : {height: '100%'}} />
            </Box>
        </LlmChatRuntimeContext.Provider>
    )
}
