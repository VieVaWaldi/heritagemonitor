import type {Metadata} from 'next'
import React from 'react'

export const metadata: Metadata = {
    title: 'Health – HeritageMonitor',
    description: 'Live status of the HeritageMonitor api.',
}

export default function HealthLayout({children}: Readonly<{ children: React.ReactNode }>) {
    return <>{children}</>
}
