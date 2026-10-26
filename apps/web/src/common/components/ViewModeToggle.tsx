'use client'

import Box from '@mui/material/Box'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import PublicIcon from '@mui/icons-material/Public'
import {Text} from '@/common/text'

export type ViewMode = 'list' | 'map'

export interface ViewModeToggleProps {
    value: ViewMode
    onChange: (mode: ViewMode) => void
}

export function ViewModeToggle({value, onChange}: ViewModeToggleProps) {
    const handleChange = (_: React.MouseEvent<HTMLElement>, next: ViewMode | null) => {
        if (next !== null) onChange(next)
    }

    return (
        <ToggleButtonGroup
            value={value}
            exclusive
            onChange={handleChange}
            size="small"
            sx={{
                flexShrink: 0,
                borderRadius: '50px',
                overflow: 'hidden',
                '& .MuiToggleButton-root': {
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 0,
                    px: 1.5,
                    py: 1.5,
                    '&:first-of-type': {borderRadius: '50px 0 0 50px'},
                    '&:last-of-type': {borderRadius: '0 50px 50px 0'},
                    '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        borderColor: 'primary.main',
                        '&:hover': {backgroundColor: 'primary.dark'},
                    },
                },
            }}
        >
            <Tooltip title="Select map view. Visualize research geospatially on an interactive map by displaying institutions and their projects.">
                <ToggleButton value="map" aria-label="Map view">
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 0.75}}>
                        <PublicIcon fontSize="small" />
                        <Text variant="caption" sx={{fontWeight: 500, lineHeight: 1}}>
                            Map
                        </Text>
                    </Box>
                </ToggleButton>
            </Tooltip>
            <Tooltip title="Select List View. Search and filter institutions, projects, or works in a classic list.">
                <ToggleButton value="list" aria-label="List view">
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 0.75}}>
                        <FormatListBulletedIcon fontSize="small" />
                        <Text variant="caption" sx={{fontWeight: 500, lineHeight: 1}}>
                            List
                        </Text>
                    </Box>
                </ToggleButton>
            </Tooltip>
        </ToggleButtonGroup>
    )
}
