import type {Metadata} from 'next'
import type React from 'react'
import {DemoNav} from '@/modules/demo/DemoNav'

export const metadata: Metadata = {
    title: 'Demo – HeritageMonitor',
    description: 'Dev-only UI reference: typography and component samples.',
}

export default function DemoLayout({children}: Readonly<{children: React.ReactNode}>) {
    return (
        <>
            <DemoNav />
            {children}
        </>
    )
}
