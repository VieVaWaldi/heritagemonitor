import type {ViewState} from 'react-map-gl/mapbox'

export type {ViewState}

// bearing/pitch/padding are almost always left at their defaults by callers
// (see DEFAULT_CAMERA in useDeckMapViewState.ts) — only longitude/latitude/zoom
// are worth requiring a caller-supplied default for.
export type PartialViewState = Pick<ViewState, 'longitude' | 'latitude' | 'zoom'> & Partial<ViewState>
