import type {NetworkNode, OrganisationNetworkResponse} from '@heritagemonitor/shared'

// The pure part of the organisation network: from the partner buckets of one
// aggregation and the organisation records behind them to the payload the map
// draws. No I/O, so the merge rules can be tested on their own (see
// apps/api/test/collaborationNetwork.test.ts).

/** One bucket of the `org_ids` aggregation: an organisation id and the projects it shares with the centre. */
export interface PartnerBucket {
    id: string
    count: number
}

/** What the organisation table knows about one record. */
export interface NetworkOrganisation {
    id: string
    name: string
    /** Records sharing it are the same institution (plan D19); `null` = only ever itself. */
    nameKey: string | null
    /** NaN when the organisation has no coordinates. */
    lat: number
    lng: number
    country: string | null
}

interface Partner {
    id: string
    ids: string[]
    name: string
    count: number
    lat: number
    lng: number
    country: string | null
}

const hasGeo = (partner: {lat: number; lng: number}) => !Number.isNaN(partner.lat) && !Number.isNaN(partner.lng)

/**
 * Folds the buckets into one partner per INSTITUTION and drops the centre's
 * own duplicate records.
 *
 * D19: the same institution sits in the index under several ids sharing a
 * `name_key`, and the busiest "pairs" are exactly that — an organisation
 * appearing to collaborate with itself. Two things follow:
 *  - any bucket sharing the centre's `name_key` is the centre, not a partner;
 *  - partners sharing one key are one node: matches are SUMMED, the best-
 *    ranked id represents the group, and a duplicate that has coordinates
 *    fills in for a representative that has none.
 */
export function mergePartners(
    buckets: readonly PartnerBucket[],
    organisations: ReadonlyMap<string, NetworkOrganisation>,
    centre: NetworkOrganisation,
): Partner[] {
    const groups = new Map<string, Partner>()

    for (const bucket of buckets) {
        if (bucket.id === centre.id) continue
        const organisation = organisations.get(bucket.id)
        // An id with no record cannot be named or placed.
        if (!organisation) continue
        if (centre.nameKey && organisation.nameKey === centre.nameKey) continue

        const key = organisation.nameKey ?? `id:${organisation.id}`
        const existing = groups.get(key)
        if (existing) {
            existing.count += bucket.count
            existing.ids.push(organisation.id)
            if (!hasGeo(existing) && hasGeo(organisation)) {
                existing.lat = organisation.lat
                existing.lng = organisation.lng
            }
            existing.country ??= organisation.country
            continue
        }
        groups.set(key, {
            id: organisation.id,
            ids: [organisation.id],
            name: organisation.name,
            count: bucket.count,
            lat: organisation.lat,
            lng: organisation.lng,
            country: organisation.country,
        })
    }

    return [...groups.values()].sort((a, b) => b.count - a.count)
}

/**
 * The payload: node 0 is the centre, then the drawable partners (those with
 * coordinates) by shared projects; one edge per drawn partner. Partners with
 * no coordinates are counted, not listed — about four in five organisations
 * have none, so the page says so instead of hiding it.
 */
export function buildOrganisationNetwork(options: {
    centre: NetworkOrganisation
    /** Projects the centre itself has under the current filters. */
    centreProjects: number
    buckets: readonly PartnerBucket[]
    organisations: ReadonlyMap<string, NetworkOrganisation>
    max: number
}): OrganisationNetworkResponse {
    const {centre, centreProjects, buckets, organisations, max} = options

    const merged = mergePartners(buckets, organisations, centre)
    const partners = merged.slice(0, max)
    const drawn = partners.filter(hasGeo)

    const centreNode: NetworkNode = {
        id: centre.id,
        ids: [centre.id],
        name: centre.name,
        lat: hasGeo(centre) ? centre.lat : null,
        lng: hasGeo(centre) ? centre.lng : null,
        w: centreProjects,
        countryCode: centre.country,
    }

    return {
        nodes: [
            centreNode,
            ...drawn.map((partner) => ({
                id: partner.id,
                ids: partner.ids,
                name: partner.name,
                lat: partner.lat,
                lng: partner.lng,
                w: partner.count,
                countryCode: partner.country,
            })),
        ],
        edges: drawn.map((partner, index) => ({a: 0, b: index + 1, w: partner.count})),
        meta: {
            partners: partners.length,
            withoutGeo: partners.length - drawn.length,
            // The aggregation was asked for max + 1 buckets: getting them all
            // means there were more partners than the cap.
            capped: buckets.length > max,
            complete: true,
        },
    }
}
