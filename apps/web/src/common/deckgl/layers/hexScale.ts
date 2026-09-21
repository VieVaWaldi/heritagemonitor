// How the funding hexes look and how they follow the camera. Every number that
// tunes them lives in THIS file.
//
// Its own module, free of deck.gl imports, so it can be unit-tested without
// pulling a WebGL bundle into Node's test runner.
//
// THE NUMBERS ARE COPIED from digicher_webinterface
// (src/components/deckgl/layers/HexagonLayer.ts + baseLayerProps.ts), whose
// hexes read as "way more granular, better zooming, more density":
//
//   radius          10 km at zoom 4.2, times 1.6^(4.2 - zoom)
//   elevationScale  400 at zoom 4.2, times the same factor (x10 on the globe)
//   elevationRange  [0, 3000]  (so the tallest hex is 3000 x 400 = 1,200 km at base zoom)
//   coverage        0.8
//   opacity         0.4
//   colorRange      6-step yellow-to-dark-red ramp, quantized
//   zoom            snapped to 0.5 steps before it reaches the layer
//
// That layer is deck.gl's HexagonLayer, whose `radius` is a continuous number
// of metres. We bin ourselves into H3 cells (so a bin keeps its member
// organisations for selection and detail), and H3 cells only come in discrete
// sizes — so the radius is realised as the H3 resolution whose cell edge is
// closest to it (hexResolutionForZoom).

/** The zoom the geometry below is tuned for. */
export const BASE_ZOOM = 4.2

/** Hex radius in metres at BASE_ZOOM. */
export const BASE_RADIUS_METERS = 10_000

/** Elevation scale at BASE_ZOOM; multiplied by the zoom factor. */
export const BASE_ELEVATION_SCALE = 400

/** The scale's output range: the tallest hex has this elevation before BASE_ELEVATION_SCALE. */
export const ELEVATION_RANGE_MAX = 3000

/** Elevation is multiplied by this on the globe, where the planet's curve hides low columns. */
export const GLOBE_ELEVATION_MULTIPLIER = 10

/** Fraction of its cell a hexagon fills. */
export const HEX_COVERAGE = 0.8

export const HEX_OPACITY = 0.4

/** Hovered hex tint, as in the original. */
export const HEX_HIGHLIGHT_RGB: readonly [number, number, number] = [1, 200, 1]

/**
 * Colour ramp, low to high: ColorBrewer YlOrRd. A hex takes the step its
 * funding falls in, relative to the tallest hex (equal-width steps, as deck's
 * default 'quantize' scale does).
 */
export const HEX_COLOR_RANGE: ReadonlyArray<readonly [number, number, number]> = [
    [255, 255, 178],
    [254, 204, 92],
    [253, 141, 60],
    [240, 59, 32],
    [189, 0, 38],
    [128, 0, 38],
]

/**
 * Elevation is linear in funding, as in the original (deck's default linear
 * scale). 1 = linear; lower (e.g. 0.5) compresses the tallest hubs.
 */
export const HEX_ELEVATION_GAMMA = 1

/** The zoom is snapped to this step before it drives the layer, so a pan never re-renders it. */
export const HEX_ZOOM_STEP = 0.5

/** Debounce before the map re-bins after the resolution the zoom asks for changed. */
export const HEX_REBIN_DEBOUNCE_MS = 250

const ZOOM_SCALE_BASE = 1.6
// Safety net only: wide enough to leave the original curve alone over the
// whole range the map can reach (zoom ~0 to ~15).
const MIN_ZOOM_FACTOR = 0.02
const MAX_ZOOM_FACTOR = 8

/** `1.6^(BASE_ZOOM - zoom)`: shrinks per level zoomed in, grows per level out. */
export function hexZoomFactor(zoom: number): number {
    const raw = Math.pow(ZOOM_SCALE_BASE, BASE_ZOOM - zoom)
    return Math.min(Math.max(raw, MIN_ZOOM_FACTOR), MAX_ZOOM_FACTOR)
}

export function snapHexZoom(zoom: number): number {
    return Math.round(zoom / HEX_ZOOM_STEP) * HEX_ZOOM_STEP
}

/** The original's hex radius at this zoom, in metres. */
export function hexRadiusMeters(zoom: number): number {
    return BASE_RADIUS_METERS * hexZoomFactor(zoom)
}

/** Elevation multiplier for the layer's `elevationScale`. */
export function hexElevationScale(zoom: number, isGlobe: boolean): number {
    return BASE_ELEVATION_SCALE * hexZoomFactor(zoom) * (isGlobe ? GLOBE_ELEVATION_MULTIPLIER : 1)
}

/** The tallest hex's elevation in metres (before the layer's elevationScale). */
export const MAX_ELEVATION_METERS = ELEVATION_RANGE_MAX

/** Which colour step (0-based) a hex of `relative` funding (0..1, tallest = 1) takes. */
export function hexColorStep(relative: number): number {
    const steps = HEX_COLOR_RANGE.length
    return Math.min(steps - 1, Math.max(0, Math.floor(relative * steps)))
}

/**
 * Average H3 cell edge length in metres per resolution (H3's published
 * table). An H3 hexagon's edge equals its circumradius, which is what
 * deck.gl's HexagonLayer `radius` means.
 */
const H3_EDGE_METERS: ReadonlyArray<{resolution: number; edge: number}> = [
    {resolution: 2, edge: 182_512.96},
    {resolution: 3, edge: 68_979.22},
    {resolution: 4, edge: 26_071.76},
    {resolution: 5, edge: 9_854.09},
    {resolution: 6, edge: 3_724.53},
    {resolution: 7, edge: 1_406.48},
    {resolution: 8, edge: 531.41},
    {resolution: 9, edge: 200.79},
    {resolution: 10, edge: 75.86},
]

/**
 * The H3 resolution whose cells are closest (in ratio) to the original's hex
 * radius at this zoom. The base zoom lands on resolution 5 (~9.9 km edge for a
 * 10 km radius); every ~1.9 zoom levels in is one resolution finer.
 */
export function hexResolutionForZoom(zoom: number): number {
    const radius = hexRadiusMeters(zoom)
    let best = H3_EDGE_METERS[0]
    for (const candidate of H3_EDGE_METERS) {
        if (Math.abs(Math.log(candidate.edge / radius)) < Math.abs(Math.log(best.edge / radius))) best = candidate
    }
    return best.resolution
}
