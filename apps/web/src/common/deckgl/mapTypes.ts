import type {Layer} from '@deck.gl/core'
import type {ReactNode} from 'react'

// The shapes every map page in this app puts on a deck.gl layer, and the
// shapes its list and detail panel read.
//
// These are DELIBERATELY not any index's document shape. The collaboration
// demo builds them from `CollaborationEdge`s, the funding page builds them
// from `/v1/funding/map`; each owns its own adapter (see the `*Adapter` files
// in those modules) and everything downstream — binning, layers, rows, cards
// — only ever sees what is here. That is what lets one hex layer serve both.

/** One project as a detail list renders it. `cost` is whatever the caller means by it. */
export interface ProjectSummary {
    id: string
    title: string
    startDate: string | null
    endDate: string | null
    frameworkProgrammes: string[]
    /** What this project cost the organisation(s) the list belongs to. */
    cost: number
}

/** An organisation as a map draws it and a list ranks it. */
export interface MapOrganisation {
    id: string
    name: string
    country: string | null
    type: string | null
    sme: boolean | null
    /** `[longitude, latitude]` — deck.gl's order, not `lat,lng`. */
    geolocation: [number, number]
    /** May be empty: a map payload can rank an organisation without listing its projects. */
    projects: ProjectSummary[]
    /** The number the map sizes and colours by. */
    funding: number
}

/**
 * Theme colours a layer factory may use, already resolved to hex strings.
 * Layers take colours as arguments rather than reading the MUI theme, so they
 * stay plain functions that can be unit-tested and reused.
 */
export interface VisualizationThemeColors {
    primary: string
    primaryLight: string
    secondary: string
    highlight: string
}

/**
 * What a paginated list and a detail tab need from any visualization's items,
 * whatever their underlying type (an edge, an organisation, ...). Each
 * visualization closes over its own typed data, so nothing here is generic.
 */
export interface ExplorerItem {
    id: string
    title: string
    subtitle: string
    renderDetail: (select: (id: string) => void) => ReactNode
}

export interface MapSelection {
    selectedId: string | null
    onSelect: (id: string) => void
}

export interface VisualizationModel {
    items: ExplorerItem[]
    createLayers: (colors: VisualizationThemeColors, selection: MapSelection) => Layer[]
}
