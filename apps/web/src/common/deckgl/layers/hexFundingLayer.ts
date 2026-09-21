import type {PickingInfo} from '@deck.gl/core'
import {H3HexagonLayer} from '@deck.gl/geo-layers'
import {hexToRgb, lerpRgb} from '../colors'
import type {HexBin} from './hexBins'

const MAX_ELEVATION_METERS = 250_000
// Sub-linear so a few huge hubs don't flatten every other hex to nothing.
const SCALE_GAMMA = 0.5

export interface HexFundingLayerOptions {
    id: string
    data: HexBin[]
    lowColorHex: string
    highColorHex: string
    highlightColorHex: string
    selectedHex: string | null
    onClick?: (info: PickingInfo<HexBin>) => void
}

export function createHexFundingLayer({
    id,
    data,
    lowColorHex,
    highColorHex,
    highlightColorHex,
    selectedHex,
    onClick,
}: HexFundingLayerOptions) {
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
        coverage: 0.92,
        getHexagon: (d) => d.hex,
        getElevation: (d) => relative(d) * MAX_ELEVATION_METERS,
        getFillColor: (d) => [...(d.hex === selectedHex ? highlight : lerpRgb(low, high, relative(d))), 220],
        onClick,
        updateTriggers: {getFillColor: [selectedHex, lowColorHex, highColorHex, highlightColorHex]},
        material: {ambient: 0.64, diffuse: 0.6, shininess: 32, specularColor: [0, 0, 0]},
    })
}
