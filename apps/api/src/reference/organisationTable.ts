import {client, indices} from '@heritagemonitor/search'

// Every organisation the app ever has to NAME or PLACE, held in memory.
//
// WHY THIS EXISTS (plan F0-11, measured on the VM): the expensive part of the
// map, network, funding and experts payloads was never the aggregation — it
// was the `mget` of the organisation documents behind it. 500 partner docs
// cost 4.6 s on the first call against the HDD (77 ms warm). The rows involved
// are small and the same for everyone, so they are loaded once.
//
// HOW IT IS STORED: parallel typed arrays plus dictionaries for the repeated
// strings, NOT 494k objects. One object per organisation would be ~500 bytes
// of header and pointer overhead each before any content; this is a handful of
// contiguous buffers, and the only per-row string allocations are `id` and
// `legalName`, which really are unique. The api runs with
// --max-old-space-size 1152 inside a 1536m container, so the layout is the
// difference between fitting and not.
//
// MEASURED on the dev index (28,137 organisations, heap sampled after an
// explicit gc): 7.4-7.7 MB retained, i.e. ~280 bytes per row, loaded in
// 0.4-2.2 s. Extrapolated to the 494k organisations of the full index that is
// ~133 MB — the per-row cost is dominated by the two strings and the id->row
// Map, none of which grow with the corpus, so the extrapolation is close to
// linear. Comfortable inside the 1152 MB old space, but it IS the single
// largest allocation the api makes: anything added to a row here costs ~0.5 MB
// per byte at full scale, which is why the columns are the minimum the map,
// funding and experts payloads need rather than the whole document.

/** Rows fetched per scan request. Larger is fewer round trips but a bigger response to parse. */
const SCAN_PAGE_SIZE = 5_000

const SOURCE = [
    'id',
    'legalName',
    'name_key',
    'countryCode',
    'region',
    'geo',
    'project_count',
    'work_count',
    'total_funding_eur',
    'has_dch_project',
] as const

interface OrganisationScanDoc {
    id: string
    legalName?: string
    name_key?: string
    countryCode?: string
    region?: string
    geo?: {lat: number; lon: number} | [number, number] | string
    project_count?: number
    work_count?: number
    total_funding_eur?: number
    has_dch_project?: boolean
}

/** What a caller gets back. Built on demand from the columns — never stored. */
export interface OrganisationTableRow {
    id: string
    name: string
    nameKey: string | null
    /** NaN when the organisation has no coordinates (~82% of them). */
    lat: number
    lng: number
    country: string | null
    region: string | null
    projectCount: number
    workCount: number
    totalFundingEur: number
    hasDchProject: boolean
}

/**
 * Repeated strings are stored as an index into a table of distinct values
 * rather than once per row. Country and region have a couple of hundred
 * distinct values between them; `name_key` has one per distinct institution,
 * which is the whole point of it — every duplicate record of the same
 * university shares one string here instead of carrying its own.
 */
class StringDictionary {
    private readonly values: string[] = ['']
    /** Build-time only: dropped by `seal()`, because it costs as much as the strings it deduplicates. */
    private indexOf: Map<string, number> | null = new Map([['', 0]])

    intern(value: string | undefined | null): number {
        if (!value) return 0
        const index = this.indexOf!
        const existing = index.get(value)
        if (existing !== undefined) return existing
        const next = this.values.push(value) - 1
        index.set(value, next)
        return next
    }

    /** No more interning; releases the lookup map. */
    seal(): void {
        this.indexOf = null
    }

    read(index: number): string | null {
        const value = this.values[index]
        return value ? value : null
    }

    get size(): number {
        return this.values.length
    }
}

interface Columns {
    ids: string[]
    names: string[]
    nameKey: Int32Array
    lat: Float32Array
    lng: Float32Array
    country: Uint16Array
    region: Uint16Array
    projectCount: Int32Array
    workCount: Int32Array
    funding: Float64Array
    hasDch: Uint8Array
    byId: Map<string, number>
    countries: StringDictionary
    regions: StringDictionary
    nameKeys: StringDictionary
}

let columns: Columns | null = null
let loading: Promise<void> | null = null

export interface OrganisationTableStatus {
    ready: boolean
    rows: number
    loadedInMs: number | null
    /** Heap used by the process right after the load finished, for the record. */
    heapUsedMb: number | null
    error: string | null
}

let status: OrganisationTableStatus = {ready: false, rows: 0, loadedInMs: null, heapUsedMb: null, error: null}

export function organisationTableStatus(): OrganisationTableStatus {
    return status
}

/**
 * True once the table can answer. Callers MUST check it and fall back to an
 * `mget` while it is false: the api serves requests from the moment it
 * listens, and the scan takes seconds.
 */
export function isOrganisationTableReady(): boolean {
    return columns !== null
}

function readGeo(geo: OrganisationScanDoc['geo']): [number, number] {
    if (!geo) return [Number.NaN, Number.NaN]
    // The index writes a geo_point; the client hands it back in whichever of
    // the accepted shapes the document used.
    if (Array.isArray(geo)) return [Number(geo[1]), Number(geo[0])]
    if (typeof geo === 'object' && 'lat' in geo) return [Number(geo.lat), Number(geo.lon)]
    if (typeof geo === 'string' && geo.includes(',')) {
        const [lat, lon] = geo.split(',')
        return [Number(lat), Number(lon)]
    }
    return [Number.NaN, Number.NaN]
}

/**
 * Scans the whole organisations index into the columns above.
 *
 * `search_after` on `_doc`, not a scroll: a scroll holds a search context open
 * on the cluster for the duration, which is exactly what a long scan over a
 * shared index should not do.
 */
async function load(): Promise<void> {
    const startedAt = Date.now()

    const ids: string[] = []
    const names: string[] = []
    const nameKeys = new StringDictionary()
    const nameKeyIndex: number[] = []
    const lat: number[] = []
    const lng: number[] = []
    const countries = new StringDictionary()
    const regions = new StringDictionary()
    const countryIndex: number[] = []
    const regionIndex: number[] = []
    const projectCount: number[] = []
    const workCount: number[] = []
    const funding: number[] = []
    const hasDch: number[] = []

    // The client types a sort cursor as plain field values, which is what
    // sorting on `_doc` yields (one document number).
    let searchAfter: Array<string | number> | undefined

    for (;;) {
        const {body} = await client.search({
            index: indices.organisationsIndexName,
            body: {
                size: SCAN_PAGE_SIZE,
                _source: [...SOURCE],
                sort: [{_doc: 'asc'}],
                track_total_hits: false,
                ...(searchAfter ? {search_after: searchAfter} : {}),
            },
        })

        const hits = body.hits.hits as unknown as Array<{_source?: OrganisationScanDoc; sort?: Array<string | number>}>
        if (hits.length === 0) break

        for (const hit of hits) {
            const source = hit._source
            if (!source?.id) continue
            const [latitude, longitude] = readGeo(source.geo)

            ids.push(source.id)
            names.push(source.legalName ?? '')
            nameKeyIndex.push(nameKeys.intern(source.name_key))
            lat.push(latitude)
            lng.push(longitude)
            countryIndex.push(countries.intern(source.countryCode))
            regionIndex.push(regions.intern(source.region))
            projectCount.push(source.project_count ?? 0)
            workCount.push(source.work_count ?? 0)
            funding.push(source.total_funding_eur ?? 0)
            hasDch.push(source.has_dch_project ? 1 : 0)
        }

        searchAfter = hits[hits.length - 1]?.sort
        if (!searchAfter || hits.length < SCAN_PAGE_SIZE) break
    }

    columns = {
        ids,
        names,
        nameKey: Int32Array.from(nameKeyIndex),
        lat: Float32Array.from(lat),
        lng: Float32Array.from(lng),
        country: Uint16Array.from(countryIndex),
        region: Uint16Array.from(regionIndex),
        projectCount: Int32Array.from(projectCount),
        workCount: Int32Array.from(workCount),
        funding: Float64Array.from(funding),
        hasDch: Uint8Array.from(hasDch),
        byId: new Map(ids.map((id, index) => [id, index])),
        countries,
        regions,
        nameKeys,
    }

    countries.seal()
    regions.seal()
    nameKeys.seal()

    status = {
        ready: true,
        rows: ids.length,
        loadedInMs: Date.now() - startedAt,
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        error: null,
    }
}

/**
 * Starts the load, once. Never throws and never blocks startup: a failure
 * leaves the table not-ready and every caller on its `mget` fallback, which is
 * slower but correct.
 */
export function startOrganisationTableLoad(log: (message: string) => void): Promise<void> {
    loading ??= load()
        .then(() => {
            log(
                `organisation table ready: ${status.rows.toLocaleString('en-US')} rows in ${status.loadedInMs} ms, heap ${status.heapUsedMb} MB`,
            )
        })
        .catch((error: unknown) => {
            status = {...status, ready: false, error: error instanceof Error ? error.message : String(error)}
            log(`organisation table failed to load (falling back to mget): ${status.error}`)
        })
    return loading
}

function rowAt(index: number): OrganisationTableRow {
    const table = columns!
    return {
        id: table.ids[index],
        name: table.names[index],
        nameKey: table.nameKeys.read(table.nameKey[index]),
        lat: table.lat[index],
        lng: table.lng[index],
        country: table.countries.read(table.country[index]),
        region: table.regions.read(table.region[index]),
        projectCount: table.projectCount[index],
        workCount: table.workCount[index],
        totalFundingEur: table.funding[index],
        hasDchProject: table.hasDch[index] === 1,
    }
}

/** One organisation, or null when it is unknown or the table is not ready. */
export function getOrganisation(id: string): OrganisationTableRow | null {
    if (!columns) return null
    const index = columns.byId.get(id)
    return index === undefined ? null : rowAt(index)
}

/**
 * Several at once, in the order asked, skipping unknown ids — the same
 * contract as `mgetDocuments`, so a caller can swap between them.
 */
export function getOrganisations(ids: readonly string[]): OrganisationTableRow[] {
    if (!columns) return []
    const rows: OrganisationTableRow[] = []
    for (const id of ids) {
        const index = columns.byId.get(id)
        if (index !== undefined) rows.push(rowAt(index))
    }
    return rows
}

/**
 * The merge group an organisation belongs to (plan D19: the same institution
 * appears under several ids sharing one `name_key`). Two ids merge exactly
 * when this is equal and non-zero; 0 means the organisation has no key and is
 * only ever itself. An integer compare, so a caller folding 200 ranked ids
 * never touches the strings.
 */
export function nameGroupOf(id: string): number {
    if (!columns) return 0
    const index = columns.byId.get(id)
    return index === undefined ? 0 : columns.nameKey[index]
}

/** Whether an organisation can be drawn on a map, without building a row for it. */
export function hasCoordinates(id: string): boolean {
    if (!columns) return false
    const index = columns.byId.get(id)
    return index !== undefined && !Number.isNaN(columns.lat[index])
}
