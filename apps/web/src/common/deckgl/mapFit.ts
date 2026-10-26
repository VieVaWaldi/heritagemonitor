// Fitting a map camera to a set of places. Pure, so it can be tested without a
// WebGL context.

export interface GeoFit {
    latitude: number
    longitude: number
    zoom: number
}

/** Tightest and loosest zoom a fit will choose: a single point or a whole continent are both still readable. */
const MIN_FIT_ZOOM = 2
const MAX_FIT_ZOOM = 9
/** Zoom for a single place, where there is no extent to fit. */
const SINGLE_POINT_ZOOM = 7
/** Share of the view the places may fill, so the outermost ones are not on the edge. */
const FIT_FILL = 0.7
/** Web-mercator tile size in pixels. */
const TILE = 512

const mercatorY = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, latitude)) * Math.PI) / 360))

/**
 * The camera that shows all `points` (`[longitude, latitude]`), centred on
 * their extent. Null for no points. `viewport` is the map's approximate size in
 * pixels — the exact size is not known to the caller, and a fit only needs to
 * be roughly right.
 */
export function fitGeoBounds(points: ReadonlyArray<readonly [number, number]>, viewport: {width: number; height: number} = {width: 600, height: 450}): GeoFit | null {
    if (points.length === 0) return null
    const lngs = points.map(([lng]) => lng)
    const lats = points.map(([, lat]) => lat)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const longitude = (minLng + maxLng) / 2
    const latitude = (minLat + maxLat) / 2

    const lngSpan = (maxLng - minLng) / 360
    const latSpan = Math.abs(mercatorY(maxLat) - mercatorY(minLat)) / (2 * Math.PI)
    if (lngSpan === 0 && latSpan === 0) return {latitude, longitude, zoom: SINGLE_POINT_ZOOM}

    const zoomFor = (span: number, pixels: number) => (span > 0 ? Math.log2((pixels * FIT_FILL) / (TILE * span)) : Infinity)
    const zoom = Math.min(zoomFor(lngSpan, viewport.width), zoomFor(latSpan, viewport.height))
    return {latitude, longitude, zoom: Math.max(MIN_FIT_ZOOM, Math.min(MAX_FIT_ZOOM, zoom))}
}
