'use client'

import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'
import {useThemeMode} from './ThemeModeProvider'

export function ThemeToggle() {
    const {mode, setMode} = useThemeMode()

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
