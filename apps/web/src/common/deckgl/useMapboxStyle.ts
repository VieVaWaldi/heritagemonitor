'use client'

// Resolves which Mapbox style to use — light/dark follows the app's own
// theme, and above ZOOM_STYLE_THRESHOLD every mode switches to Mapbox's
// "standard" style (its buildings/label density only reads well once
// zoomed in close). Ported from digicher_webinterface's DeckGLMap.tsx,
// which computed this inline.

const ZOOM_STYLE_THRESHOLD = 13

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

export interface MapboxStyle {
    /** e.g. "mapbox/light-v11" — the bare style id Mapbox's REST endpoints (tiles, styles) expect */
    id: string
    /** `mapbox://styles/...` — what react-map-gl's <Map> takes directly */
    url: string
    /** {z}/{x}/{y} raster tile template for deck.gl's TileLayer (globe mode has no <Map>, see DeckMapCanvas) */
    tileUrlTemplate: string
}

export function useMapboxStyle(zoom: number, isDark: boolean): MapboxStyle {
    const themeStyle = isDark ? 'mapbox/dark-v11' : 'mapbox/light-v11'
    const id = zoom > ZOOM_STYLE_THRESHOLD ? 'mapbox/standard' : themeStyle

    return {
        id,
        url: `mapbox://styles/${id}`,
        tileUrlTemplate: `https://api.mapbox.com/styles/v1/${id}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`,
    }
}
