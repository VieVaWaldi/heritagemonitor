// "Modern Heritage" palette — teal primary, gold secondary, heritage-crimson
// warning. Ported from digicher_webinterface's src/lib/theme.ts, which is
// the earlier build of this same product.
export const palette = {
    light: {
        background: '#fafafa',
        paper: '#ffffff',
        text: '#1a1a1a',
        textSecondary: '#4a4a4a',
        primary: '#2C5F66',
        primaryLight: '#3d7a82',
        primaryDark: '#1e4249',
        link: '#2C5F66',
        secondary: '#8B6914',
        secondaryLight: '#a8822a',
        secondaryDark: '#6b500f',
        warning: '#A8293C',
        warningLight: '#c44058',
        warningDark: '#7A2232',
        border: '#e0e0e0',
        divider: '#e8e8e8',
    },
    dark: {
        background: '#121212',
        paper: '#1e1e1e',
        text: '#f5f5f5',
        textSecondary: '#b0b0b0',
        primary: '#4a9ba5',
        primaryLight: '#6bb5be',
        primaryDark: '#2C5F66',
        link: '#4a9ba5',
        secondary: '#d4a84b',
        secondaryLight: '#e0bc6e',
        secondaryDark: '#8B6914',
        warning: '#c4445a',
        warningLight: '#d96878',
        warningDark: '#7A2232',
        border: '#333333',
        divider: '#2a2a2a',
    },
} as const

export type ThemeMode = 'light' | 'dark'
