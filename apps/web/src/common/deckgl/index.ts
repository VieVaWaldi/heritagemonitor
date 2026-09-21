// The app's deck.gl building blocks: the map canvas and its controls, the
// generic layer factories, and the list/detail pieces a map page pairs them
// with. Nothing here knows about any OpenSearch index — a page adapts its own
// payload into ./mapTypes and everything below works on that (see
// apps/web/RULES.md #3 and #4: third-party deck.gl stays wrapped in here).

export {DeckMapCanvas} from './DeckMapCanvas'
export {MapControls} from './MapControls'
export {MapStatusOverlay} from './MapStatusOverlay'
export {useDeckMapViewState} from './useDeckMapViewState'
export {useMapboxStyle} from './useMapboxStyle'
export {useVisualizationColors} from './useVisualizationColors'
export type {DeckMapViewState} from './useDeckMapViewState'
export type {MapboxStyle} from './useMapboxStyle'
export type {PartialViewState, ViewState} from './types'

export type {
    ExplorerItem,
    MapOrganisation,
    MapSelection,
    ProjectSummary,
    VisualizationModel,
    VisualizationThemeColors,
} from './mapTypes'

export {hexToRgb, lerpRgb} from './colors'
export {formatCount, formatDateRange, formatFunding} from './format'

export {HEX_RESOLUTION, hexBinsFromOrganisations} from './layers/hexBins'
export type {HexBin} from './layers/hexBins'
export {createHexFundingLayer} from './layers/hexFundingLayer'
export {BASE_ZOOM, HEX_REBIN_DEBOUNCE_MS, hexResolutionForZoom, hexZoomFactor} from './layers/hexScale'
export type {HexFundingLayerOptions} from './layers/hexFundingLayer'
export {ArcNetworkLayer} from './layers/arcNetworkLayer'
export type {ArcNetworkLink, ArcNetworkNode, ArcNetworkLayerProps} from './layers/arcNetworkLayer'
export {institutionIconUrl} from './layers/icons'

export {ExplorerRow} from './explorer/ExplorerRow'
export {OrganisationCard} from './explorer/OrganisationCard'
export {ProjectList} from './explorer/ProjectList'
