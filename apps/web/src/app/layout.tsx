import {AppRouterCacheProvider} from '@mui/material-nextjs/v16-appRouter'
import {NextIntlClientProvider} from 'next-intl'
import type {Metadata} from 'next'
import type React from 'react'
import {ThemeModeProvider} from '@/common/theme/ThemeModeProvider'
import {ebGaramond, inter} from '@/common/theme/fonts'
import {CorpusProvider} from '@/common/catalog'
import {PageChatContextProvider} from '@/common/llmchat/PageChatContext'

export const metadata: Metadata = {
    title: 'HeritageMonitor',
    description: 'Scientometric platform for cultural heritage research',
}

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
    return (
        <html lang="en" className={`${inter.variable} ${ebGaramond.variable}`}>
            <body>
                <AppRouterCacheProvider>
                    <ThemeModeProvider>
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
