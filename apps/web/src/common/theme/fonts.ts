import {EB_Garamond, Inter} from 'next/font/google'

// Body text. Exposed as a CSS variable and applied on <html> in the root
// layout so every page gets it without importing this file directly.
export const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
})

// Headings — kept as a distinct serif to match the "Modern Heritage" identity.
export const ebGaramond = EB_Garamond({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-eb-garamond',
    weight: ['400', '500', '600', '700'],
})
