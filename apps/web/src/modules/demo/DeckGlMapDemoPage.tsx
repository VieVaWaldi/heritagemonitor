'use client'

import {useCallback, useMemo, useState} from 'react'
import type {CollaborationEdge} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import {useTheme} from '@mui/material/styles'
import {NAVBAR_HEIGHT, PaginatedList, TabbedPanel} from '@/common/components'
import {useDeckMapViewState} from '@/common/deckgl'
import {Text} from '@/common/text'
import {DeckGlMapTab} from './deckgl/DeckGlMapTab'
import {ExplorerRow} from './deckgl/ExplorerRow'
import {useCollaborationEdges} from './deckgl/useCollaborationEdges'
import {DEFAULT_VISUALIZATION_ID, VISUALIZATIONS} from './deckgl/visualizations'

const PAGE_SIZE = 10

// Default view: centered over continental Europe, where the sampled
// collaboration edges are concentrated (see the extraction that produced
// apps/web/public/demo/collaboration-edges.json). Tilted so hexagon height reads.
const DEFAULT_VIEW_STATE = {longitude: 8, latitude: 48, zoom: 4, pitch: 30}

// Stable reference (not `[]` inline below) so the model useMemo doesn't
// recompute every render while edgesState is still loading.
const EMPTY_EDGES: CollaborationEdge[] = []

// Search-style layout: a paginated list of the items the map draws on the
// left, a tabbed panel (map / selected item) on the right. The list, the map
// and the detail tab all share one selectedId.
export function DeckGlMapDemoPage() {
    const theme = useTheme()
    const edgesState = useCollaborationEdges()
    const [visualizationId, setVisualizationId] = useState(DEFAULT_VISUALIZATION_ID)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const viewState = useDeckMapViewState(DEFAULT_VIEW_STATE)

    const colors = useMemo(
        () => ({
            primary: theme.palette.primary.main,
            primaryLight: theme.palette.primary.light,
            secondary: theme.palette.secondary.main,
            highlight: theme.palette.warning.main,
        }),
        [theme],
    )

    const edges = edgesState.state === 'ok' ? edgesState.edges : EMPTY_EDGES
    const visualization = VISUALIZATIONS.find((v) => v.id === visualizationId) ?? VISUALIZATIONS[0]
    const model = useMemo(() => visualization.prepare(edges), [visualization, edges])

    // Selecting from the map also jumps the list to the item's page.
    const select = useCallback(
        (id: string) => {
            setSelectedId(id)
            const index = model.items.findIndex((item) => item.id === id)
            if (index >= 0) setPage(Math.floor(index / PAGE_SIZE) + 1)
        },
        [model],
    )

    const layers = useMemo(
        () => model.createLayers(colors, {selectedId, onSelect: select}),
        [model, colors, selectedId, select],
    )

    function handleVisualizationChange(id: string) {
        setVisualizationId(id)
        setSelectedId(null)
        setPage(1)
    }

    const selectedItem = model.items.find((item) => item.id === selectedId)
    const pageCount = Math.max(1, Math.ceil(model.items.length / PAGE_SIZE))
    const pageItems = model.items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    return (
        <Box sx={{p: 4}}>
            <Box
                sx={{
                    width: '90%',
                    mx: 'auto',
                    height: `calc(100dvh - ${NAVBAR_HEIGHT}px - 64px)`,
                    display: 'flex',
                    gap: 3,
                }}
            >
                <Box sx={{flex: '1 1 0', minWidth: 0}}>
                    <PaginatedList
                        header={
                            <Text variant="body2" color="text.secondary">
                                {model.items.length} {visualization.itemNoun}
                            </Text>
                        }
                        items={pageItems}
                        getItemKey={(item) => item.id}
                        renderItem={(item) => <ExplorerRow item={item} selected={item.id === selectedId} onSelect={select} />}
                        page={page}
                        pageCount={pageCount}
                        onPageChange={setPage}
                    />
                </Box>

                <Box sx={{flex: '2 1 0', minWidth: 0}}>
                    <TabbedPanel
                        tabs={[
                            {
                                value: 'map',
                                label: 'Map',
                                fill: true,
                                keepMounted: true,
                                content: (
                                    <DeckGlMapTab
                                        visualizations={VISUALIZATIONS}
                                        visualization={visualization}
                                        onVisualizationChange={handleVisualizationChange}
                                        layers={layers}
                                        viewState={viewState}
                                        edgesState={edgesState}
                                    />
                                ),
                            },
                            {
                                value: 'details',
                                label: 'Details',
                                content: (
                                    <Box sx={{p: 2.5}}>
                                        {selectedItem ? (
                                            selectedItem.renderDetail(select)
                                        ) : (
                                            <Text variant="body2" color="text.secondary">
                                                {visualization.emptyDetailHint}
                                            </Text>
                                        )}
                                    </Box>
                                ),
                            },
                        ]}
                    />
                </Box>
            </Box>
        </Box>
    )
}
