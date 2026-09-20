'use client'

import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {Navbar} from '@/common/components'
import {ThemeToggle} from '@/common/theme/ThemeToggle'

const TABS = [
    {href: '/demo/typography', label: 'Typography'},
    {href: '/demo/components', label: 'Components'},
    {href: '/demo/llmchat', label: 'LLM Chat'},
    {href: '/demo/search', label: 'Search Layout'},
    {href: '/demo/deckgl', label: 'Deck.gl Map'},
]

// Scoped to the /demo route tree — dev-only UI reference, not user-facing.
export function DemoNav() {
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
