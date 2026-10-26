// Whether Lucy's side panel is open. Free of React so it can be unit-tested.

/**
 * An EXPLICIT default, not an accident of `useState(false)`: open on the
 * landing page on desktop (Lucy is the first thing a visitor should notice),
 * closed everywhere else and always closed on phones, where it is a
 * full-screen overlay.
 *
 * `userChoice` is what the user did with the toggle, or null if nothing yet.
 * Once set it wins over the default for the rest of the session — so a panel
 * the user closed never re-opens itself (on navigation back to the landing
 * page, on a resize across the breakpoint, ...).
 */
export function resolveChatOpen({
    userChoice,
    isLanding,
    isMobile,
}: {
    userChoice: boolean | null
    isLanding: boolean
    isMobile: boolean
}): boolean {
    if (userChoice !== null) return userChoice
    return isLanding && !isMobile
}

/** The landing page is exactly `/`. */
export function isLandingPath(pathname: string | null): boolean {
    return pathname === '/'
}
