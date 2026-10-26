'use client'

import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {Navbar} from '@/common/components'
import {ThemeToggle} from '@/common/theme/ThemeToggle'

const TABS = [
    {href: '/health', label: 'Overview'},
    {href: '/health/requestTime', label: 'Request Time'},
    {href: '/health/requestCount', label: 'Request Count'},
    {href: '/health/liveRequests', label: 'Live Requests'},
    {href: '/health/breadcrumbs', label: 'Breadcrumbs'},
]

// Scoped to the /health route tree (rendered from app/health/layout.tsx)
export function HealthNav() {
    const pathname = usePathname()
    const activeTab = TABS.some((tab) => tab.href === pathname) ? pathname : false

    return (
        <Navbar bordered>
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
                <Tabs value={activeTab}>
                    {TABS.map((tab) => (
                        <Tab
                            key={tab.href}
                            label={tab.label}
                            value={tab.href}
                            component={Link}
                            href={tab.href}
                        />
                    ))}
                </Tabs>
                <ThemeToggle />
            </Box>
        </Navbar>
    )
}
