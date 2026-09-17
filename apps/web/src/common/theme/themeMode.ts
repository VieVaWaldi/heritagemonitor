import type {ThemeMode} from './palette'

// Plain, directive-free module (no 'use client') so both app/layout.tsx (a
// Server Component) and ThemeModeProvider.tsx (a Client Component) can use
// these — a 'use client' file's exports can only be rendered as a
// component or passed as props from server code, never called directly as
// a plain function, which is exactly what layout.tsx needs to do with
// isMode() to resolve the theme-mode cookie.

export type Mode = ThemeMode | 'system'

export const THEME_MODE_COOKIE = 'theme-mode'

export function isMode(value: unknown): value is Mode {
    return value === 'light' || value === 'dark' || value === 'system'
}
