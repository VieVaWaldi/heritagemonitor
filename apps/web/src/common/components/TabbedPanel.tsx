'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import type {ReactNode} from 'react'

export interface TabbedPanelTab {
    value: string
    label: string
    content: ReactNode
}

export interface TabbedPanelProps {
    tabs: TabbedPanelTab[]
    /** Which tab is selected initially. Defaults to the first tab. */
    defaultValue?: string
}

// Generic rectangular container that fills 100% of whatever height its
// parent gives it: a tab strip hugs the top, and the active tab's content
// fills the rest. Doesn't know what's inside a tab — that's the caller's.
export function TabbedPanel({tabs, defaultValue}: TabbedPanelProps) {
    const [value, setValue] = useState(defaultValue ?? tabs[0]?.value)
    const activeTab = tabs.find((tab) => tab.value === value)

    return (
        <Paper
            variant="outlined"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <Tabs
                value={value}
                onChange={(_event, newValue) => setValue(newValue)}
                // Default height is 48px border included — PaginatedList's
                // header box is pinned to the same 48px by hand so the two
                // line up when they sit side by side.
                sx={{borderBottom: 1, borderColor: 'divider', flexShrink: 0}}
            >
                {tabs.map((tab) => (
                    <Tab key={tab.value} value={tab.value} label={tab.label} />
                ))}
            </Tabs>

            <Box sx={{flex: '1 1 auto', overflowY: 'auto'}}>{activeTab?.content}</Box>
        </Paper>
    )
}
