'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import {
    _GlobeView as GlobeView,
    COORDINATE_SYSTEM,
    MapView,
    type LayersList,
    type PickingInfo,
} from '@deck.gl/core'
import {BitmapLayer} from '@deck.gl/layers'
import {TileLayer} from '@deck.gl/geo-layers'
import DeckGL from '@deck.gl/react'
import Map from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import {useTheme} from '@mui/material/styles'
import {useIsMobile} from '@/common/hooks/useIsMobile'
import {useMapboxStyle} from './useMapboxStyle'
import {MapStatusOverlay} from './MapStatusOverlay'
import {TamedMapController} from './TamedMapController'
import type {CommandedViewState} from './useDeckMapViewState'
import type {ViewState} from './types'

// Inertia = the map keeps gliding after a drag is released. Module-level so
// deck.gl sees the same controller object every render.
const CONTROLLER = {inertia: true}
const MOBILE_CONTROLLER = {type: TamedMapController, inertia: true}

// The only files in this package that import @deck.gl/* or react-map-gl are
// this one and TamedMapController — everything else (useDeckMapViewState,
// MapControls, MapStatusOverlay) is plain React/MUI, per apps/web/RULES.md
// #4 (wrap external components).
//
// Sized by its parent: renders at 100%/100%, so the caller controls the
// footprint via a normal MUI Box with an explicit height — this is what
// makes it embeddable anywhere, unlike digicher_webinterface's DeckGLMap.tsx
// which always assumed a fullscreen (100dvh) parent.

export interface DeckMapCanvasProps {
    id: string
    layers: LayersList
    initialViewState: ViewState
    commandedViewState: CommandedViewState | undefined
    onViewStateChange: (viewState: ViewState) => void
    isGlobe: boolean
    onClick?: (info: PickingInfo) => void
    getTooltip?: (info: PickingInfo) => string | null
    loading?: boolean
    error?: Error | null
}

export function DeckMapCanvas({
    id,
    layers,
    initialViewState,
    commandedViewState,
    onViewStateChange,
    isGlobe,
    onClick,
    getTooltip,
    loading,
    error,
}: DeckMapCanvasProps) {
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'
    const isMobile = useIsMobile()
    const [zoom, setZoom] = useState(initialViewState.zoom)
    const mapboxStyle = useMapboxStyle(zoom, isDark)

    // react-map-gl's <Map> can't render under deck.gl's GlobeView, so globe
    // mode swaps it for a raster background layer instead (Mapbox's styles
    // API serves any style as {z}/{x}/{y} tiles, vector or not).
    const globeBackgroundLayers: LayersList = isGlobe
        ? [
              new TileLayer({
                  id: `${id}-globe-background`,
                  data: mapboxStyle.tileUrlTemplate,
                  minZoom: 0,
                  maxZoom: 19,
                  tileSize: 256,
                  renderSubLayers: (props) => {
                      const {boundingBox} = props.tile
                      return new BitmapLayer(props, {
                          data: undefined,
                          image: props.data,
                          _imageCoordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
                          bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]],
                      })
                  },
              }),
          ]
        : []

    return (
        <Box sx={{position: 'relative', width: '100%', height: '100%'}}>
            <DeckGL
                id={`deck-${id}`}
                initialViewState={initialViewState}
                viewState={commandedViewState}
                onViewStateChange={({viewState: next}) => {
                    const vs = next as ViewState
                    setZoom(vs.zoom)
                    onViewStateChange(vs)
                }}
                views={isGlobe ? new GlobeView({id: 'globe'}) : new MapView({id: 'mercator'})}
                layers={isGlobe ? [...globeBackgroundLayers, ...layers] : layers}
                controller={isMobile && !isGlobe ? MOBILE_CONTROLLER : CONTROLLER}
                onClick={onClick}
                getTooltip={getTooltip}
                getCursor={({isDragging, isHovering}) => (isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab')}
            >
                {!isGlobe && (
                    <Map
                        mapStyle={mapboxStyle.url}
                        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
                        projection={{name: 'mercator'}}
                    />
                )}
            </DeckGL>

            <MapStatusOverlay loading={loading} error={error} />
        </Box>
    )
}
