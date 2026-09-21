// The default camera of each kind of map, in one place.
//
// A `view=lat,lng,zoom` URL carries no pitch or bearing, so a copied link (or
// an old one) opens at these; a camera the user tilted is not written back.

/**
 * The organisation/query network maps: tilted, because a flat map draws every
 * arc as a line and a tilted one lifts the great-circle arcs off the ground,
 * so the partners' arcs separate from each other and from the icons.
 */
export const NETWORK_MAP_CAMERA = {pitch: 50, bearing: 0} as const
