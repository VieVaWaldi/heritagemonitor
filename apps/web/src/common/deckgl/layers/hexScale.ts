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

// ---------------------------------------------------------------------------
// Everything that tunes the look of the funding hexes lives in this file.

/**
 * Tallest a hex can stand at the base zoom, in metres. Column heights stay
 * relative to each other (see SCALE_GAMMA in the layer); this is only the
 * ceiling. Doubled from 190 km so the tallest hub stands out clearly.
 *
 * Tuned TOGETHER with HEX_COVERAGE: height and width compound into the
 * apparent aspect ratio.
 */
export const MAX_ELEVATION_METERS = 380_000

/**
 * How much of its H3 cell a hexagon fills. Constant now that the cell itself
 * shrinks as you zoom in (see HEX_RESOLUTION_BY_ZOOM), so the columns keep the
 * same on-screen proportions. Below about 0.45 they read as needles.
 */
export const HEX_COVERAGE = 0.55

/**
 * H3 resolution per zoom: finer hexes the closer you are. One resolution step
 * shrinks a cell's edge by ~2.65x, which is ~1.4 zoom levels, so the thresholds
 * are spaced to keep cells about the same size on screen. Zoom 4 (the default
 * continental view) is resolution 3, as before. Ascending by `minZoom`.
 */
export const HEX_RESOLUTION_BY_ZOOM: ReadonlyArray<{minZoom: number; resolution: number}> = [
    {minZoom: 0, resolution: 2},
    {minZoom: 3, resolution: 3},
    {minZoom: 5.2, resolution: 4},
    {minZoom: 6.6, resolution: 5},
    {minZoom: 8, resolution: 6},
    {minZoom: 9.4, resolution: 7},
    {minZoom: 10.8, resolution: 8},
]

/** Debounce before the map re-bins after the resolution the zoom asks for changed. */
export const HEX_REBIN_DEBOUNCE_MS = 250

export function hexResolutionForZoom(zoom: number): number {
    let resolution = HEX_RESOLUTION_BY_ZOOM[0].resolution
    for (const step of HEX_RESOLUTION_BY_ZOOM) {
        if (zoom >= step.minZoom) resolution = step.resolution
    }
    return resolution
}
