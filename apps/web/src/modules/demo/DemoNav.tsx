'use client'

import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {ThemeToggle} from '@/common/theme/ThemeToggle'

const TABS = [
    {href: '/demo/typography', label: 'Typography'},
    {href: '/demo/components', label: 'Components'},
]

// Scoped to the /demo route tree — dev-only UI reference, not user-facing.
export function DemoNav() {
    const pathname = usePathname()
    const activeTab = TABS.some((tab) => tab.href === pathname) ? pathname : false

    return (
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 4}}>
            <Tabs value={activeTab} sx={{borderBottom: 1, borderColor: 'divider'}}>
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
    )
}
