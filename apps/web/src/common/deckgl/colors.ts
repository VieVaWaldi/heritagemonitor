// deck.gl layers want [r, g, b] tuples; the app's theme gives hex strings
// (theme.palette.primary.main etc.) — this is the one conversion point so
// every layer factory below can just take the theme's hex colors directly.

export function hexToRgb(hex: string): [number, number, number] {
    const value = hex.replace('#', '')
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]
}

export function lerpRgb(from: [number, number, number], to: [number, number, number], t: number): [number, number, number] {
    const clamped = Math.min(Math.max(t, 0), 1)
    return [
        Math.round(from[0] + (to[0] - from[0]) * clamped),
        Math.round(from[1] + (to[1] - from[1]) * clamped),
        Math.round(from[2] + (to[2] - from[2]) * clamped),
    ]
}
