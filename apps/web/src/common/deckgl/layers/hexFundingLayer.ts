import type {PickingInfo} from '@deck.gl/core'
import {H3HexagonLayer} from '@deck.gl/geo-layers'
import {
    BASE_ZOOM,
    HEX_COLOR_RANGE,
    HEX_COVERAGE,
    HEX_ELEVATION_GAMMA,
    HEX_HIGHLIGHT_RGB,
    HEX_OPACITY,
    hexColorStep,
    hexElevationScale,
    MAX_ELEVATION_METERS,
} from './hexScale'
import type {HexBin} from './hexBins'
import {hexToRgb} from '../colors'

// The look of the layer is tuned in ./hexScale (numbers copied from
// digicher_webinterface); this only applies it.

export interface HexFundingLayerOptions {
    id: string
    data: HexBin[]
    /** The selected hex's colour — the ramp colours everything else. */
    highlightColorHex: string
    selectedHex: string | null
    /**
     * Current camera zoom (snapped, see snapHexZoom). Drives the height, so the
     * columns keep roughly the same on-screen height as the map moves; the
     * footprint follows the H3 resolution the caller binned with.
     */
    zoom?: number
    isGlobe?: boolean
    onClick?: (info: PickingInfo<HexBin>) => void
}

export function createHexFundingLayer({
    id,
    data,
    highlightColorHex,
    selectedHex,
    zoom = BASE_ZOOM,
    isGlobe = false,
    onClick,
}: HexFundingLayerOptions) {
    const highlight = hexToRgb(highlightColorHex)
    const maxFunding = Math.max(1, ...data.map((bin) => bin.funding))
    const relative = (bin: HexBin) => Math.pow(bin.funding / maxFunding, HEX_ELEVATION_GAMMA)

    return new H3HexagonLayer<HexBin>({
        id,
        data,
        pickable: true,
        extruded: true,
        opacity: HEX_OPACITY,
        autoHighlight: true,
        highlightColor: [...HEX_HIGHLIGHT_RGB, 255],
        coverage: HEX_COVERAGE,
        elevationScale: hexElevationScale(zoom, isGlobe),
        getHexagon: (d) => d.hex,
        getElevation: (d) => relative(d) * MAX_ELEVATION_METERS,
        getFillColor: (d) => [...(d.hex === selectedHex ? highlight : HEX_COLOR_RANGE[hexColorStep(relative(d))]), 255],
        onClick,
        updateTriggers: {getFillColor: [selectedHex, highlightColorHex]},
        material: {ambient: 0.64, diffuse: 0.6, shininess: 32, specularColor: [0, 0, 0]},
    })
}
