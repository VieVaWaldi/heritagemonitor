'use client'

import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import IconButton from '@mui/material/IconButton'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'
import {useThemeMode} from './ThemeModeProvider'

export interface ThemeToggleProps {
    // 'grouped' (default) is the standalone bordered ToggleButtonGroup used
    // in DemoNav/HealthNav. 'bare' drops that chrome — three plain icons
    // with no border/background of their own — for use inside a panel that
    // already supplies a shared background (see CorpusPanel).
    variant?: 'grouped' | 'bare'
}

export function ThemeToggle({variant = 'grouped'}: ThemeToggleProps) {
    const {mode, setMode} = useThemeMode()

    if (variant === 'bare') {
        return (
            <>
                <IconButton
                    aria-label="light"
                    color={mode === 'light' ? 'primary' : 'default'}
                    onClick={() => setMode('light')}
                >
                    <LightModeIcon fontSize="small" />
                </IconButton>
                <IconButton
                    aria-label="system"
                    color={mode === 'system' ? 'primary' : 'default'}
                    onClick={() => setMode('system')}
                >
                    <SettingsSuggestIcon fontSize="small" />
                </IconButton>
                <IconButton
                    aria-label="dark"
                    color={mode === 'dark' ? 'primary' : 'default'}
                    onClick={() => setMode('dark')}
                >
                    <DarkModeIcon fontSize="small" />
                </IconButton>
            </>
        )
    }

    return (
        <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_, next) => next && setMode(next)}
            aria-label="color scheme"
        >
            <ToggleButton value="light" aria-label="light">
                <LightModeIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="system" aria-label="system">
                <SettingsSuggestIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="dark" aria-label="dark">
                <DarkModeIcon fontSize="small" />
            </ToggleButton>
        </ToggleButtonGroup>
    )
}
