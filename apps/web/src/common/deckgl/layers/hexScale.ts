// How the hex columns follow the camera.
//
// Its own module, free of deck.gl imports, so the curve can be unit-tested
// without pulling a WebGL bundle into Node's test runner.
//
// Ported from digicher_webinterface's ColumnLayer/HexagonLayer, which scaled
// both radius and elevation by `1.6^(BASE_ZOOM - zoom)`: halve for every zoom
// level in, double for every level out. Without it the columns are invisible
// specks at continental zoom and 375 km walls you end up inside of when you
// zoom to a city.

/** The zoom the geometry below is tuned for. */
export const BASE_ZOOM = 4.2

const ZOOM_SCALE_BASE = 1.6
// Clamped at both ends: the raw curve reaches absurd values a few levels out
// and collapses to nothing a few levels in.
const MIN_ZOOM_FACTOR = 0.12
const MAX_ZOOM_FACTOR = 3.5

export function hexZoomFactor(zoom: number): number {
    const raw = Math.pow(ZOOM_SCALE_BASE, BASE_ZOOM - zoom)
    return Math.min(Math.max(raw, MIN_ZOOM_FACTOR), MAX_ZOOM_FACTOR)
}
