import type {PickingInfo} from '@deck.gl/core'
import {H3HexagonLayer} from '@deck.gl/geo-layers'
import {hexToRgb, lerpRgb} from '../colors'
import {BASE_ZOOM, HEX_COVERAGE, hexZoomFactor, MAX_ELEVATION_METERS} from './hexScale'
import type {HexBin} from './hexBins'

// Sub-linear so a few huge hubs don't flatten every other hex to nothing.
const SCALE_GAMMA = 0.5


export interface HexFundingLayerOptions {
    id: string
    data: HexBin[]
    lowColorHex: string
    highColorHex: string
    highlightColorHex: string
    selectedHex: string | null
    /**
     * Current camera zoom. Drives the height (world metres, so the columns
     * keep roughly the same on-screen height as the map moves); the footprint
     * follows the H3 resolution the caller binned with. Defaults
     * to the zoom the geometry is tuned for.
     */
    zoom?: number
    onClick?: (info: PickingInfo<HexBin>) => void
}

export function createHexFundingLayer({
    id,
    data,
    lowColorHex,
    highColorHex,
    highlightColorHex,
    selectedHex,
    zoom = BASE_ZOOM,
    onClick,
}: HexFundingLayerOptions) {
    const factor = hexZoomFactor(zoom)
    const low = hexToRgb(lowColorHex)
    const high = hexToRgb(highColorHex)
    const highlight = hexToRgb(highlightColorHex)
    const maxFunding = Math.max(1, ...data.map((bin) => bin.funding))
    const relative = (bin: HexBin) => Math.pow(bin.funding / maxFunding, SCALE_GAMMA)

    return new H3HexagonLayer<HexBin>({
        id,
        data,
        pickable: true,
        extruded: true,
        coverage: HEX_COVERAGE,
        elevationScale: factor,
        getHexagon: (d) => d.hex,
        getElevation: (d) => relative(d) * MAX_ELEVATION_METERS,
        getFillColor: (d) => [...(d.hex === selectedHex ? highlight : lerpRgb(low, high, relative(d))), 220],
        onClick,
        updateTriggers: {getFillColor: [selectedHex, lowColorHex, highColorHex, highlightColorHex]},
        material: {ambient: 0.64, diffuse: 0.6, shininess: 32, specularColor: [0, 0, 0]},
    })
}
