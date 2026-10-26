'use client'

// Resolves which Mapbox style to use: light/dark follows the app's own theme,
// and nothing else does.
//
// This used to switch to Mapbox's "standard" style above zoom 13 (ported from
// digicher_webinterface's DeckGLMap.tsx). Removed: swapping the basemap
// mid-zoom re-tiles the whole map and changes its colours underneath the
// layers drawn on top, so a pan across the threshold looked like a bug. The
// `zoom` argument is kept so callers do not all have to change and a future
// style rule has somewhere to live.

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

export interface MapboxStyle {
    /** e.g. "mapbox/light-v11" — the bare style id Mapbox's REST endpoints (tiles, styles) expect */
    id: string
    /** `mapbox://styles/...` — what react-map-gl's <Map> takes directly */
    url: string
    /** {z}/{x}/{y} raster tile template for deck.gl's TileLayer (globe mode has no <Map>, see DeckMapCanvas) */
    tileUrlTemplate: string
}

export function useMapboxStyle(_zoom: number, isDark: boolean): MapboxStyle {
    const id = isDark ? 'mapbox/dark-v11' : 'mapbox/light-v11'

    return {
        id,
        url: `mapbox://styles/${id}`,
        tileUrlTemplate: `https://api.mapbox.com/styles/v1/${id}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`,
    }
}
