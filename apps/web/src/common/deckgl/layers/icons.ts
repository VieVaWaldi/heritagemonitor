// Ported from digicher_webinterface's layers/icons.tsx — kept just the plain
// SVG-data-URI generator (the canvas-rendered cluster badge isn't needed at
// this dataset's scale, ~2000 points, see visualizations.ts).
//
// The glyph is MUI's ApartmentIcon — the icon the app already uses for
// organisations (common/catalog/entities.ts) — so a map marker and the
// "Organisations" entity read as the same thing. deck.gl needs an image, not a
// React component, hence the raw path (the `d` of @mui/icons-material's
// Apartment, 24x24 viewBox) rasterised through an SVG data URI.
const INSTITUTION_ICON_PATH =
    'M17 11V3H7v4H3v14h8v-4h2v4h8V11zM7 19H5v-2h2zm0-4H5v-2h2zm0-4H5V9h2zm4 4H9v-2h2zm0-4H9V9h2zm0-4H9V5h2zm4 8h-2v-2h2zm0-4h-2V9h2zm0-4h-2V5h2zm4 12h-2v-2h2zm0-4h-2v-2h2z'

export function institutionIconUrl(color: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64"><path fill="${color}" d="${INSTITUTION_ICON_PATH}"/></svg>`
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * How big the organisation icon is on every map that draws it. The size is in
 * metres between the two pixel bounds, so it grows as you zoom in; the FLOOR
 * is what you see zoomed far out. (Was doubled to 40/128 for a while and
 * judged too big; back to 20/64.)
 */
export const ORG_ICON_SIZE_METERS = 800
export const ORG_ICON_MIN_PIXELS = 20
export const ORG_ICON_MAX_PIXELS = 64
