'use client'

import type {Layer} from '@deck.gl/core'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select, {type SelectChangeEvent} from '@mui/material/Select'
import {DeckMapCanvas, MapControls, type DeckMapViewState} from '@/common/deckgl'
import {Text} from '@/common/text'
import {collaborationTooltip} from './collaborationTooltip'
import type {CollaborationEdgesState} from './useCollaborationEdges'
import type {Visualization} from './explorerTypes'

export interface DeckGlMapTabProps {
    visualizations: Visualization[]
    visualization: Visualization
    onVisualizationChange: (id: string) => void
    layers: Layer[]
    viewState: DeckMapViewState
    edgesState: CollaborationEdgesState
}

// Fills the whole tab: a slim title row (name, description, view switcher)
// above a map that takes every remaining pixel.
export function DeckGlMapTab({
    visualizations,
    visualization,
    onVisualizationChange,
    layers,
    viewState,
    edgesState,
}: DeckGlMapTabProps) {
    function handleChange(event: SelectChangeEvent) {
        onVisualizationChange(event.target.value)
    }

    return (
        <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column'}}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, flexShrink: 0}}>
                <Text variant="subtitle1" sx={{flexShrink: 0, fontWeight: 600}}>
                    {visualization.title}
                </Text>
                <Text variant="body2" truncate color="text.secondary" sx={{flex: '1 1 auto', minWidth: 0}}>
                    {visualization.description}
                </Text>
                <FormControl size="small" sx={{minWidth: 180, flexShrink: 0}}>
                    <Select value={visualization.id} onChange={handleChange}>
                        {visualizations.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <Box sx={{position: 'relative', flex: '1 1 0', minHeight: 0}}>
                {/* Absolute so the canvas's 100% height resolves against a definite size, not the flex item. */}
                <Box sx={{position: 'absolute', inset: 0}}>
                    <DeckMapCanvas
                        id="demo-collaboration-network"
                        layers={layers}
                        initialViewState={viewState.initialViewState}
                        commandedViewState={viewState.commandedViewState}
                        onViewStateChange={viewState.onViewStateChange}
                        isGlobe={viewState.isGlobe}
                        getTooltip={collaborationTooltip}
                        loading={edgesState.state === 'loading'}
                        error={edgesState.state === 'error' ? new Error(edgesState.message) : null}
                    />
                </Box>

                <Box sx={{position: 'absolute', bottom: 16, right: 16}}>
                    <MapControls
                        onReset={viewState.reset}
                        onZoomIn={() => viewState.zoomBy(1)}
                        onZoomOut={() => viewState.zoomBy(-1)}
                        onGeolocate={viewState.geolocate}
                        isGlobe={viewState.isGlobe}
                        onToggleGlobe={viewState.toggleGlobe}
                    />
                </Box>
            </Box>
        </Box>
    )
}
