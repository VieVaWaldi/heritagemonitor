import {latLngToCell} from 'h3-js'
import type {MapOrganisation} from '../mapTypes'

// H3 resolution 3 (~100 km across): coarse enough that a country reads as a
// handful of hexes at the default continental zoom, fine enough that Paris
// and Lyon stay separate. All hexes in one H3HexagonLayer must share it. This
// is the default; the funding map picks one per zoom (hexResolutionForZoom).
export const HEX_RESOLUTION = 3

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
