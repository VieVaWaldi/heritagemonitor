'use client'

import Box from '@mui/material/Box'
import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react'
import {MOBILE_SIDE_MENU_WIDTH, SideMenu} from '@/common/components'
import {useIsMobile} from '@/common/hooks/useIsMobile'
import {usePathname} from 'next/navigation'
import {isLandingPath, resolveChatOpen} from './chatOpen'
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
    // null = the user has not touched the toggle: the default applies (see
    // resolveChatOpen). Once they have, their choice wins for the session.
    const [userChoice, setUserChoice] = useState<boolean | null>(null)
    const [topOffset, setTopOffset] = useState(0)
    const [resetKey, setResetKey] = useState(0)
    const isMobile = useIsMobile()
    const isLanding = isLandingPath(usePathname())
    const open = resolveChatOpen({userChoice, isLanding, isMobile})

    const toggle = useCallback(() => setUserChoice(!open), [open])
    const clear = useCallback(() => setResetKey((key) => key + 1), [])

    const runtimeValue = useMemo<LlmChatRuntimeValue>(
        () => ({open, toggle, topOffset, setTopOffset}),
        [open, toggle, topOffset],
    )

    // One <Box>, one <SideMenu> and one <LlmChatBox> call site regardless of
    // isMobile — not two separate mobile/desktop JSX branches each with
    // their own <LlmChatBox> — so flipping isMobile (resizing across the
    // breakpoint, or the SSR-vs-hydration mismatch useMediaQuery can
    // momentarily produce on first paint) only changes props on the same
    // elements instead of swapping in a structurally different subtree.
    // React only preserves a component's state (here, the whole
    // conversation) across a re-render when it's the same element type at
    // the same position in its parent's children — two separate branches,
    // even ones that both end in a <LlmChatBox>, would make its nearest
    // differing ancestor remount, which remounts everything below it too.
    return (
        <LlmChatRuntimeContext.Provider value={runtimeValue}>
            {children}

            {/* Ancestor positions this for the current breakpoint — full-
                viewport overlay (mobile, so SideMenu's absolute panel and the
                backdrop below have something to position against) or a
                simple fixed dock beside content (desktop, unchanged from
                before this used SideMenu). <SideMenu> itself is ALWAYS the
                one call site below regardless of isMobile — same reasoning
                as LlmChatBox's own singleton comment: a ternary that swapped
                the WRAPPER's component type between breakpoints would make
                React remount everything inside it, including LlmChatBox,
                the moment the window crossed the breakpoint — losing the
                conversation. Only props (width, hideHeader) and the
                mobile-only backdrop sibling differ; SideMenu and LlmChatBox
                both stay put. */}
            <Box
                sx={
                    isMobile
                        ? {
                              position: 'fixed',
                              inset: 0,
                              zIndex: (theme) => theme.zIndex.drawer,
                              pointerEvents: open ? 'auto' : 'none',
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
                              // One below appBar, not appBar itself: Navbar
                              // and SearchBar's suggestions dropdown (see
                              // Navbar.tsx, SearchBar.tsx) both sit at
                              // exactly theme.zIndex.appBar, so this stays
                              // beneath both rather than the panel
                              // (irrelevantly, since top: topOffset already
                              // keeps it clear of the Navbar) covering a
                              // dropdown that happens to render near it.
                              zIndex: (theme) => theme.zIndex.appBar - 1,
                              pointerEvents: open ? 'auto' : 'none',
                          }
                }
            >
                {/* Mobile only, same backdrop HMMenu's own left menu dims the
                    page with — the panel is no longer full width, so there is
                    page behind it to dim and a tap-outside-to-close target. */}
                {isMobile && open && (
                    <Box
                        onClick={toggle}
                        aria-hidden
                        sx={{position: 'absolute', inset: 0, zIndex: 999, backgroundColor: 'rgba(0, 0, 0, 0.45)'}}
                    />
                )}
                <SideMenu
                    side="right"
                    // Desktop keeps ChatBox's own "Lucy" + icon header
                    // (LlmChatHeaderRight, via LlmChatBox's showHeader) rather
                    // than this one, via hideHeader — so there's nothing to
                    // title here on that breakpoint.
                    title={isMobile ? 'Lucy' : null}
                    open={open}
                    onClose={toggle}
                    width={isMobile ? MOBILE_SIDE_MENU_WIDTH : LLM_CHAT_PANEL_WIDTH}
                    // Must survive being closed — see the module comment
                    // above and LlmChatBox's own singleton comment: this is
                    // one conversation that outlives navigation, not a menu
                    // that's cheap to rebuild from nothing each time.
                    keepMounted
                    // LlmChatBox manages its own scrolling (a pinned composer
                    // below a scrolling message list) — wrapping it in a
                    // second padded scroll container would fight that.
                    disableBodyPadding
                    hideHeader={!isMobile}
                >
                    <LlmChatBox key={resetKey} onClear={clear} showHeader={!isMobile} sx={{flex: 1, minHeight: 0}} />
                </SideMenu>
            </Box>
        </LlmChatRuntimeContext.Provider>
    )
}
