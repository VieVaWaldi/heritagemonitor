import {latLngToCell} from 'h3-js'
import type {MapOrganisation} from '../mapTypes'
import {BASE_ZOOM, hexResolutionForZoom} from './hexScale.ts'

// Imported with its .ts extension so Node's test runner can load this file.
// The resolution at the default zoom. The funding map picks one per zoom
// instead (hexResolutionForZoom); this is for callers with no camera, like the
// demo. All hexes in one H3HexagonLayer must share one resolution.
export const HEX_RESOLUTION = hexResolutionForZoom(BASE_ZOOM)

export interface HexBin {
    hex: string
    /** Biggest funding first — same order as the input organisations */
    organisations: MapOrganisation[]
    funding: number
}

// We bin ourselves instead of using deck.gl's HexagonLayer aggregation, so
// the bin keeps its member organisations (for selection and detail).
export function hexBinsFromOrganisations(organisations: MapOrganisation[], resolution: number = HEX_RESOLUTION): HexBin[] {
    const byHex = new Map<string, HexBin>()

    for (const org of organisations) {
        const [lng, lat] = org.geolocation
        const hex = latLngToCell(lat, lng, resolution)
        const bin = byHex.get(hex)
        if (bin) {
            bin.organisations.push(org)
            bin.funding += org.funding
        } else {
            byHex.set(hex, {hex, organisations: [org], funding: org.funding})
        }
    }

    return Array.from(byHex.values())
}
