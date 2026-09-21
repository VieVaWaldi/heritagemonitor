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
    /** Content stretches to the tab's full height and manages its own scrolling (e.g. a map) instead of scrolling with the panel. */
    fill?: boolean
    /** Stay mounted (hidden) while another tab is active, so state like a map's camera survives tab switches. */
    keepMounted?: boolean
}

export interface TabbedPanelProps {
    tabs: TabbedPanelTab[]
    /** Which tab is selected initially. Defaults to the first tab. */
    defaultValue?: string
}

// MUI Tabs' default strip height, border included (see the Tabs comment below).
const TAB_STRIP_HEIGHT = 48

// Generic rectangular container that fills 100% of whatever height its
// parent gives it: a tab strip hugs the top, and the active tab's content
// fills the rest. Doesn't know what's inside a tab — that's the caller's.
export function TabbedPanel({tabs, defaultValue}: TabbedPanelProps) {
    const [value, setValue] = useState(defaultValue ?? tabs[0]?.value)

    return (
        <Paper
            variant="outlined"
            sx={{
                position: 'relative',
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

            {tabs.map((tab) => {
                const active = tab.value === value
                if (!active && !tab.keepMounted) return null

                return (
                    <Box
                        key={tab.value}
                        sx={[
                            tab.fill
                                ? {flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column'}
                                : {flex: '1 1 auto', overflowY: 'auto'},
                            // Hidden, not display:none — keeps its size so a map inside doesn't
                            // collapse to 0x0 and fail to repaint when the tab comes back.
                            !active && {
                                position: 'absolute',
                                top: TAB_STRIP_HEIGHT,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                visibility: 'hidden',
                                pointerEvents: 'none',
                            },
                        ]}
                    >
                        {tab.content}
                    </Box>
                )
            })}
        </Paper>
    )
}
