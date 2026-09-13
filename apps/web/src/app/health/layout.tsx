import type {Metadata} from 'next'
import React from 'react'
import {HealthNav} from '@/modules/health/HealthNav'

export const metadata: Metadata = {
    title: 'Health – HeritageMonitor',
    description: 'Live status of the HeritageMonitor api.',
}

export default function HealthLayout({children}: Readonly<{children: React.ReactNode}>) {
    return (
        <>
            <HealthNav />
            {children}
        </>
    )
}
