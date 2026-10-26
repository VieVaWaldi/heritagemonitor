import type {FundingMapOrganisation} from '@heritagemonitor/shared'
import type {MapOrganisation} from '@/common/deckgl'

// ADAPTER: /v1/funding/map's payload -> the MapOrganisation shape that
// @/common/deckgl's binning and layers speak. The demo's collaboration page
// has its own adapter to the same target type; neither knows about the other.
//
// The api already sends the smallest thing that can be drawn, so this is a
// rename plus deck.gl's coordinate order — which is [longitude, latitude],
// the opposite of how the payload (and everyone) says it.

export function mapOrganisationsFrom(orgs: FundingMapOrganisation[]): MapOrganisation[] {
    return orgs.map((org) => ({
        id: org.id,
        name: org.name,
        country: null,
        type: null,
        sme: null,
        geolocation: [org.lng, org.lat],
        // The map ranks and colours by money only; a point carries no project
        // list, which is what keeps 500 of them a 66 KB payload.
        projects: [],
        funding: org.fundingEur,
    }))
}
