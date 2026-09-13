'use client'

import type {RequestTimeWindow} from '@heritagemonitor/shared'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

const WINDOW_OPTIONS: {value: RequestTimeWindow; label: string}[] = [
    {value: '1m', label: '1 min'},
    {value: '1h', label: '1 hour'},
    {value: '6h', label: '6 hours'},
    {value: '24h', label: '24 hours'},
    {value: '7d', label: '7 days'},
    {value: '14d', label: '14 days'},
]

interface WindowToggleProps {
    value: RequestTimeWindow
    onChange: (window: RequestTimeWindow) => void
}

export function WindowToggle({value, onChange}: WindowToggleProps) {
    function handleChange(_event: unknown, next: RequestTimeWindow | null) {
        if (next) onChange(next)
    }

    return (
        <ToggleButtonGroup size="small" exclusive value={value} onChange={handleChange}>
            {WINDOW_OPTIONS.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                    {option.label}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    )
}
