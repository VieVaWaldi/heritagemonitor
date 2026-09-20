'use client'

import AddIcon from '@mui/icons-material/Add'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import PublicIcon from '@mui/icons-material/Public'
import MapIcon from '@mui/icons-material/Map'
import RefreshIcon from '@mui/icons-material/Refresh'
import RemoveIcon from '@mui/icons-material/Remove'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import {IconTextButton} from '@/common/components'

// Bottom-right zoom/reset/geolocate/globe cluster. Ported from
// digicher_webinterface's MapController.tsx, minus the scenario-specific
// bits (side-menu-aware positioning, feedback button) — positioning is left
// to the caller via `sx` since this is meant to sit inside any Box, not
// just a fullscreen map.

export interface MapControlsProps {
    onReset: () => void
    onZoomIn: () => void
    onZoomOut: () => void
    onGeolocate: () => void
    isGlobe: boolean
    onToggleGlobe: () => void
}

export function MapControls({onReset, onZoomIn, onZoomOut, onGeolocate, isGlobe, onToggleGlobe}: MapControlsProps) {
    return (
        <Stack direction="column" spacing={1}>
            <Paper elevation={4} sx={{borderRadius: '20%'}}>
                <IconTextButton onClick={onReset} icon={<RefreshIcon />} tooltip="Reset view" placement="left" />
            </Paper>
            <Paper elevation={4} sx={{borderRadius: '20%'}}>
                <IconTextButton
                    onClick={onToggleGlobe}
                    icon={isGlobe ? <MapIcon /> : <PublicIcon />}
                    tooltip={isGlobe ? 'Switch to 2D' : 'Switch to 3D globe'}
                    placement="left"
                />
            </Paper>
            <Paper elevation={4} sx={{borderRadius: '20%'}}>
                <IconTextButton onClick={onGeolocate} icon={<MyLocationIcon />} tooltip="Zoom to your location" placement="left" />
            </Paper>
            <Paper elevation={4} sx={{borderRadius: '8px'}}>
                <Stack direction="column" spacing={0}>
                    <IconTextButton onClick={onZoomIn} icon={<AddIcon />} tooltip="Zoom in" placement="left" />
                    <IconTextButton onClick={onZoomOut} icon={<RemoveIcon />} tooltip="Zoom out" placement="left" />
                </Stack>
            </Paper>
        </Stack>
    )
}
