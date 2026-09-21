import type {PickingInfo} from '@deck.gl/core'
import {H3HexagonLayer} from '@deck.gl/geo-layers'
import {hexToRgb, lerpRgb} from '../colors'
import {BASE_ZOOM, hexZoomFactor} from './hexScale'
import type {HexBin} from './hexBins'

/**
 * Tallest a hex can stand at the base zoom.
 *
 * Tuned TOGETHER with BASE_COVERAGE, not independently: height and width
 * compound into the apparent aspect ratio. Halving the footprint and raising
 * the height at the same time turned the map into a field of needles. This is
 * ~50% taller RELATIVE to the narrower column, which is the shape that was
 * wanted — the absolute metre value is lower than the old 250 km because the
 * column it belongs to is half as wide.
 */
const MAX_ELEVATION_METERS = 190_000

/**
 * How much of its H3 cell a hexagon fills. An H3 cell is a fixed patch of the
 * earth, so this is the only width control there is — at the old 0.92 the
 * hexes touched and the map read as a tiled surface rather than a set of
 * columns.
 *
 * TUNING: this and MAX_ELEVATION_METERS are the two knobs for the columns'
 * look, and they compound into the apparent aspect ratio. Lower = narrower;
 * below about 0.45 they read as needles that occlude each other.
 */
const BASE_COVERAGE = 0.55

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
     * Current camera zoom. Drives both the footprint and the height, so the
     * columns keep roughly the same on-screen size as the map moves. Defaults
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
        coverage: Math.min(BASE_COVERAGE * factor, 0.9),
        elevationScale: factor,
        getHexagon: (d) => d.hex,
        getElevation: (d) => relative(d) * MAX_ELEVATION_METERS,
        getFillColor: (d) => [...(d.hex === selectedHex ? highlight : lerpRgb(low, high, relative(d))), 220],
        onClick,
        updateTriggers: {getFillColor: [selectedHex, lowColorHex, highColorHex, highlightColorHex]},
        material: {ambient: 0.64, diffuse: 0.6, shininess: 32, specularColor: [0, 0, 0]},
    })
}
