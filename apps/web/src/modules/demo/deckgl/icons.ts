// Ported from digicher_webinterface's layers/icons.tsx — kept just the plain
// SVG-data-URI generator (the canvas-rendered cluster badge isn't needed at
// this dataset's scale, ~2000 points, see visualizations.ts).
const INSTITUTION_ICON_PATH = 'M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zm-5-9L2 6v2h20V6z'

export function institutionIconUrl(color: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64"><path fill="${color}" d="${INSTITUTION_ICON_PATH}"/></svg>`
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
