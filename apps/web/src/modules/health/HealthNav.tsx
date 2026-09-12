'use client'

import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Link from 'next/link'
import {usePathname} from 'next/navigation'

const TABS = [
    {href: '/health', label: 'Overview'},
    {href: '/health/requestTime', label: 'Request Time'},
    {href: '/health/requestCount', label: 'Request Count'},
]

// Scoped to the /health route tree (rendered from app/health/layout.tsx)
export function HealthNav() {
    const pathname = usePathname()
    const activeTab = TABS.some((tab) => tab.href === pathname) ? pathname : false

    return (
        <Tabs value={activeTab} sx={{borderBottom: 1, borderColor: 'divider', px: 4}}>
            {TABS.map((tab) => (
                <Tab key={tab.href} label={tab.label} value={tab.href} component={Link} href={tab.href}/>
            ))}
        </Tabs>
    )
}
