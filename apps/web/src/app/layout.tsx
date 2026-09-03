import {AppRouterCacheProvider} from '@mui/material-nextjs/v15-appRouter'
import type {Metadata} from 'next'
import React from "react";

export const metadata: Metadata = {
    title: 'HeritageMonitor',
    description: 'Scientometric platform for cultural heritage research',
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
        <body>
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
        </body>
        </html>
    )
}