'use client'

import {useMemo, useState} from 'react'
import type {CollaborationEdge} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select, {type SelectChangeEvent} from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import {useTheme} from '@mui/material/styles'
import {DeckMapCanvas, MapControls, useDeckMapViewState} from '@/common/deckgl'
import {collaborationTooltip} from './deckgl/collaborationTooltip'
import {useCollaborationEdges} from './deckgl/useCollaborationEdges'
import {DEFAULT_VISUALIZATION_ID, VISUALIZATIONS} from './deckgl/visualizations'

// Default view: centered over continental Europe, where the sampled
// collaboration edges are concentrated (see the extraction that produced
// apps/web/public/demo/collaboration-edges.json).
const DEFAULT_VIEW_STATE = {longitude: 8, latitude: 48, zoom: 4}

// Stable reference (not `[]` inline below) so the layers useMemo doesn't
// recompute every render while edgesState is still loading.
const EMPTY_EDGES: CollaborationEdge[] = []

export function DeckGlMapDemoPage() {
    const theme = useTheme()
    const edgesState = useCollaborationEdges()
    const [visualizationId, setVisualizationId] = useState(DEFAULT_VISUALIZATION_ID)
    const viewState = useDeckMapViewState(DEFAULT_VIEW_STATE)

    const colors = useMemo(
        () => ({
            primary: theme.palette.primary.main,
            primaryLight: theme.palette.primary.light,
            secondary: theme.palette.secondary.main,
        }),
        [theme],
    )

    const edges = edgesState.state === 'ok' ? edgesState.edges : EMPTY_EDGES
    const visualization = VISUALIZATIONS.find((v) => v.id === visualizationId) ?? VISUALIZATIONS[0]

    const layers = useMemo(() => visualization.createLayers(edges, colors, {}), [visualization, edges, colors])

    function handleVisualizationChange(event: SelectChangeEvent) {
        setVisualizationId(event.target.value)
    }

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, p: 2}}>
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2}}>
                <Typography variant="h6">Collaboration network</Typography>
                <FormControl size="small" sx={{minWidth: 220}}>
                    <Select value={visualizationId} onChange={handleVisualizationChange}>
                        {VISUALIZATIONS.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <Typography variant="body2" color="text.secondary">
                {visualization.description}
            </Typography>

            <Paper variant="outlined" sx={{position: 'relative', height: 600, overflow: 'hidden'}}>
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
            </Paper>
        </Box>
    )
}
