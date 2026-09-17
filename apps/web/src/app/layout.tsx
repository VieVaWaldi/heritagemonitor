import {cookies} from 'next/headers'
import {AppRouterCacheProvider} from '@mui/material-nextjs/v16-appRouter'
import {NextIntlClientProvider} from 'next-intl'
import type {Metadata} from 'next'
import type React from 'react'
import {ThemeModeProvider} from '@/common/theme/ThemeModeProvider'
import {isMode, THEME_MODE_COOKIE} from '@/common/theme/themeMode'
import {ebGaramond, inter} from '@/common/theme/fonts'
import {CorpusProvider} from '@/common/catalog'
import {PageChatContextProvider} from '@/common/llmchat/PageChatContext'

export const metadata: Metadata = {
    title: 'HeritageMonitor',
    description: 'Scientometric platform for cultural heritage research',
}

export default async function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
    // Read here (a Server Component), not in ThemeModeProvider itself (a
    // Client Component — next/headers isn't available there), so the
    // server's very first render already uses the visitor's real theme
    // instead of always guessing 'light'. See ThemeModeProvider's own
    // comment on why that used to require a post-mount flip.
    const storedMode = (await cookies()).get(THEME_MODE_COOKIE)?.value
    const initialMode = isMode(storedMode) ? storedMode : 'light'

    return (
        <html lang="en" className={`${inter.variable} ${ebGaramond.variable}`}>
            <body>
                <AppRouterCacheProvider>
                    <ThemeModeProvider initialMode={initialMode}>
                        <NextIntlClientProvider>
                            <CorpusProvider>
                                <PageChatContextProvider>{children}</PageChatContextProvider>
                            </CorpusProvider>
                        </NextIntlClientProvider>
                    </ThemeModeProvider>
                </AppRouterCacheProvider>
            </body>
        </html>
    )
}
