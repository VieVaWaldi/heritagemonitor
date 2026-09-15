import {AppRouterCacheProvider} from '@mui/material-nextjs/v15-appRouter'
import {NextIntlClientProvider} from 'next-intl'
import type {Metadata} from 'next'
import type React from 'react'
import {ThemeModeProvider} from '@/common/theme/ThemeModeProvider'
import {ebGaramond, inter} from '@/common/theme/fonts'
import {CorpusProvider} from '@/common/catalog'

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
                            <CorpusProvider>{children}</CorpusProvider>
                        </NextIntlClientProvider>
                    </ThemeModeProvider>
                </AppRouterCacheProvider>
            </body>
        </html>
    )
}
