import {arcsVisualization} from './arcsVisualization'
import type {Visualization} from './explorerTypes'
import {hexesVisualization} from './hexesVisualization'

// The registry the demo page's dropdown reads from. Every entry reshapes
// the *same* CollaborationEdge[] client-side — no visualization needed a
// different OpenSearch document shape, which is what made both worth
// building on one dataset instead of one each.
//
// Hexagons are H3 cells we bin into ourselves (see hexBins.ts), not deck.gl's
// HexagonLayer: its CPU aggregator in @deck.gl/aggregation-layers 9.4.0
// computed garbage bin positions for the highest-weight bins (a bin whose
// points were all in Paris reported a position near Antarctica).

export const VISUALIZATIONS: Visualization[] = [arcsVisualization, hexesVisualization]

export const DEFAULT_VISUALIZATION_ID = VISUALIZATIONS[0].id
