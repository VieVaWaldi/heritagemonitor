'use client'

import {createContext, useContext, useMemo, useSyncExternalStore} from 'react'
import {ThemeProvider} from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import CssBaseline from '@mui/material/CssBaseline'
import {darkTheme, lightTheme} from './theme'
import {isMode, THEME_MODE_COOKIE, type Mode} from './themeMode'
import type {ThemeMode} from './palette'

interface ThemeModeContextValue {
    mode: Mode
    setMode: (mode: Mode) => void
    resolvedMode: ThemeMode
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined)

export function useThemeMode() {
    const context = useContext(ThemeModeContext)
    if (!context) {
        throw new Error('useThemeMode must be used within ThemeModeProvider')
    }
    return context
}

// The mode preference lives in both localStorage (read/written through a
// tiny external store rather than React state — lets it survive a full
// reload without a setState-in-effect round-trip, and gives same-tab
// reactivity the native `storage` event doesn't, since that only fires in
// *other* tabs) and a cookie of the same name/value (THEME_MODE_COOKIE, in
// ./themeMode.ts). The cookie exists purely so app/layout.tsx (a Server
// Component) can read it via next/headers' cookies() and pass the real
// mode into this provider as `initialMode` — localStorage never reaches
// the server at all, so without the cookie the server has no way to know
// the mode and has to guess. See
// https://react.dev/reference/react/useSyncExternalStore.
const MODE_STORAGE_KEY = 'heritagemonitor.theme-mode'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

let listeners: Array<() => void> = []

function getStoredMode(): Mode {
    try {
        const stored = localStorage.getItem(MODE_STORAGE_KEY)
        if (isMode(stored)) return stored
    } catch {
        // localStorage can throw (private browsing, blocked site data) — fall
        // through to the default.
    }
    return 'light'
}

function setStoredMode(mode: Mode) {
    try {
        localStorage.setItem(MODE_STORAGE_KEY, mode)
    } catch {
        // Best-effort persistence; the mode still applies for this render.
    }
    try {
        document.cookie = `${THEME_MODE_COOKIE}=${mode}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
    } catch {
        // Same best-effort reasoning as the localStorage write above.
    }
    listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
    listeners = [...listeners, listener]
    return () => {
        listeners = listeners.filter((l) => l !== listener)
    }
}

// `initialMode` (from the cookie, resolved server-side) is the server
// snapshot here instead of a hardcoded default — the server's render and
// the client's first (hydration-matching) render now agree on the real
// mode from the start, so there's no post-mount flip needed and nothing
// for a Suspense boundary hydrating on its own schedule (e.g. SearchNav on
// /search/*, which needs one for useSearchParams()) to race against. See
// the dark-mode Navbar hydration-mismatch investigation this replaced.
function useMode(initialMode: Mode): [Mode, (mode: Mode) => void] {
    const mode = useSyncExternalStore(subscribe, getStoredMode, () => initialMode)
    return [mode, setStoredMode]
}

export interface ThemeModeProviderProps {
    children: React.ReactNode
    /** Resolved from the theme-mode cookie in app/layout.tsx. Defaults to
     * 'light' for any other (cookie-less) usage. */
    initialMode?: Mode
}

export function ThemeModeProvider({children, initialMode = 'light'}: ThemeModeProviderProps) {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
    const [mode, setMode] = useMode(initialMode)

    // 'system' mode still can't be resolved server-side (no standard way to
    // read the OS color-scheme preference from an HTTP request without
    // opting into Sec-CH-Prefers-Color-Scheme client hints, which this app
    // doesn't) — an explicit light/dark choice is fully SSR-correct from the
    // cookie above, 'system' still resolves client-side via useMediaQuery.
    const resolvedMode: ThemeMode = mode === 'system' ? (prefersDarkMode ? 'dark' : 'light') : mode
    const theme = useMemo(() => (resolvedMode === 'dark' ? darkTheme : lightTheme), [resolvedMode])
    const contextValue = useMemo(() => ({mode, setMode, resolvedMode}), [mode, setMode, resolvedMode])

    return (
        <ThemeModeContext.Provider value={contextValue}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeModeContext.Provider>
    )
}
