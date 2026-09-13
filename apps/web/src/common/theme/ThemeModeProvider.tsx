'use client'

import {createContext, useContext, useMemo, useSyncExternalStore} from 'react'
import {ThemeProvider} from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import CssBaseline from '@mui/material/CssBaseline'
import {darkTheme, lightTheme} from './theme'
import type {ThemeMode} from './palette'

type Mode = ThemeMode | 'system'

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

// The mode preference lives in localStorage, read/written through a tiny
// external store rather than React state — this is what lets it survive a
// full reload without a setState-in-effect round-trip on mount (the server
// has no localStorage, so its snapshot is always 'light') and without a
// separate mechanism for same-tab reactivity (the native `storage` event
// only fires in *other* tabs). See
// https://react.dev/reference/react/useSyncExternalStore.
const MODE_STORAGE_KEY = 'heritagemonitor.theme-mode'
let listeners: Array<() => void> = []

function isMode(value: unknown): value is Mode {
    return value === 'light' || value === 'dark' || value === 'system'
}

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
    listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
    listeners = [...listeners, listener]
    return () => {
        listeners = listeners.filter((l) => l !== listener)
    }
}

function getServerMode(): Mode {
    return 'light'
}

function useMode(): [Mode, (mode: Mode) => void] {
    const mode = useSyncExternalStore(subscribe, getStoredMode, getServerMode)
    return [mode, setStoredMode]
}

// The server always renders as "not mounted" (it can't know the client's
// color-scheme preference or stored mode); the client flips to true right
// after hydration.
function useMounted() {
    return useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    )
}

export function ThemeModeProvider({children}: {children: React.ReactNode}) {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
    const [mode, setMode] = useMode()
    const mounted = useMounted()

    const resolvedMode: ThemeMode = mode === 'system' ? (prefersDarkMode ? 'dark' : 'light') : mode
    const theme = useMemo(() => (resolvedMode === 'dark' ? darkTheme : lightTheme), [resolvedMode])
    const contextValue = useMemo(
        () => ({mode, setMode, resolvedMode}),
        [mode, setMode, resolvedMode],
    )

    // Avoid a light->dark flash: render the light theme until mounted, since
    // the server can't know the client's stored mode or color-scheme
    // preference.
    const activeTheme = mounted ? theme : lightTheme

    return (
        <ThemeModeContext.Provider value={contextValue}>
            <ThemeProvider theme={activeTheme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeModeContext.Provider>
    )
}
