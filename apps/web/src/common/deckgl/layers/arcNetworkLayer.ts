import {CompositeLayer, type PickingInfo} from '@deck.gl/core'
import {ArcLayer, IconLayer} from '@deck.gl/layers'
import {hexToRgb} from '../colors'
import {institutionIconUrl, ORG_ICON_MAX_PIXELS, ORG_ICON_MIN_PIXELS, ORG_ICON_SIZE_METERS} from './icons'

// Arcs between places, plus one icon per place.
//
// CompositeLayer pattern ported from digicher_webinterface's
// TopicNetworkLayer — deck.gl only calls onHover/onClick on the top-level
// layer, never on sublayers set up inside renderLayers(), so all three
// sublayers share the single onHover/onClick given to this outer layer.
//
// Generic on purpose: it takes plain `ArcNetworkLink`/`ArcNetworkNode` values,
// not any index's document. The collaboration demo adapts its
// `CollaborationEdge`s into these (see modules/demo/deckgl), and the
// organisation-network page of a later slice can adapt whatever it has
// without this file learning about either.

const MIN_ARC_WIDTH = 1
const MAX_ARC_WIDTH = 6
const SELECTED_ARC_WIDTH = 6
/** An emphasized arc is this many times as wide as its weight says. */
const EMPHASIZED_WIDTH_FACTOR = 1.8
/** An emphasized icon is this many times as big, floor and ceiling included. */
const EMPHASIZED_ICON_FACTOR = 1.5
/** Everything else recedes to this alpha while an arc is selected. */
const DIMMED_ALPHA = 60
/** From this many links, a node is drawn as a hub (secondary colour). */
const HUB_LINK_COUNT_THRESHOLD = 2


/** One arc: two endpoints and how strongly they are connected. */
export interface ArcNetworkLink {
    id: string
    /** `[longitude, latitude]`. */
    source: [number, number]
    target: [number, number]
    /** Drives arc width, relative to the largest weight in the set. */
    weight: number
    /** Overrides the layer's two arc colours for this arc (e.g. its cluster's colour). */
    color?: [number, number, number]
    /** Part of what is NOT selected: drawn faded. */
    dimmed?: boolean
    /** Part of what is selected: full opacity and a heavier line. */
    emphasized?: boolean
}

/** One endpoint, de-duplicated across the links that touch it. */
export interface ArcNetworkNode {
    id: string
    geolocation: [number, number]
    /** Distinct partners — decides whether this node reads as a hub. */
    linkCount: number
    /** Overrides the hub/plain icon colour (a `#rrggbb` hex), e.g. the node's cluster colour. */
    colorHex?: string
    /** Not part of the selection: drawn faded. */
    dimmed?: boolean
    /** Part of the selection: full opacity and a larger icon. */
    emphasized?: boolean
}

export interface ArcNetworkLayerProps {
    id: string
    data: ArcNetworkLink[]
    nodes: ArcNetworkNode[]
    primaryColorHex: string
    secondaryColorHex: string
    highlightColorHex: string
    selectedLinkId: string | null
    onHover?: (info: PickingInfo) => void
    onClick?: (info: PickingInfo) => void
}

export class ArcNetworkLayer extends CompositeLayer<ArcNetworkLayerProps> {
    static layerName = 'ArcNetworkLayer'

    renderLayers() {
        const {id, data, nodes, primaryColorHex, secondaryColorHex, highlightColorHex, selectedLinkId, onHover, onClick} = this.props
        if (!data.length) return []

        const primaryColor = hexToRgb(primaryColorHex)
        const secondaryColor = hexToRgb(secondaryColorHex)
        const highlightColor = hexToRgb(highlightColorHex)
        const maxWeight = Math.max(1, ...data.map((link) => link.weight))
        const selectedLink = selectedLinkId ? data.find((link) => link.id === selectedLinkId) : undefined
        const baseAlpha = selectedLink ? DIMMED_ALPHA : 255

        const arcLayer = new ArcLayer<ArcNetworkLink>({
            id: `${id}-arcs`,
            data,
            getSourcePosition: (d) => d.source,
            getTargetPosition: (d) => d.target,
            getSourceColor: (d) => [...(d.color ?? primaryColor), d.dimmed ? DIMMED_ALPHA : baseAlpha],
            getTargetColor: (d) => [...(d.color ?? secondaryColor), d.dimmed ? DIMMED_ALPHA : baseAlpha],
            getWidth: (d) => (MIN_ARC_WIDTH + (d.weight / maxWeight) * (MAX_ARC_WIDTH - MIN_ARC_WIDTH)) * (d.emphasized ? EMPHASIZED_WIDTH_FACTOR : 1),
            widthMinPixels: MIN_ARC_WIDTH,
            greatCircle: true,
            pickable: true,
            onHover,
            onClick,
            updateTriggers: {
                getSourceColor: [baseAlpha, primaryColorHex, data],
                getTargetColor: [baseAlpha, secondaryColorHex, data],
            },
        })

        // Its own layer so it draws above the other arcs, not somewhere inside them.
        const selectedArcLayer = new ArcLayer<ArcNetworkLink>({
            id: `${id}-selected-arc`,
            data: selectedLink ? [selectedLink] : [],
            getSourcePosition: (d) => d.source,
            getTargetPosition: (d) => d.target,
            getSourceColor: highlightColor,
            getTargetColor: highlightColor,
            getWidth: SELECTED_ARC_WIDTH,
            widthMinPixels: SELECTED_ARC_WIDTH,
            greatCircle: true,
            pickable: false,
        })

        // Two icon layers: the emphasized organisations get a larger floor and
        // ceiling as well, which a per-object size alone could not give them.
        const iconLayer = (suffix: string, data: ArcNetworkNode[], factor: number) =>
            new IconLayer<ArcNetworkNode>({
                id: `${id}-icons${suffix}`,
                data,
                pickable: true,
                getPosition: (d) => d.geolocation,
                getIcon: (d) => ({
                    url: institutionIconUrl(d.colorHex ?? (d.linkCount >= HUB_LINK_COUNT_THRESHOLD ? secondaryColorHex : primaryColorHex)),
                    width: 64,
                    height: 64,
                    anchorY: 64,
                }),
                getColor: (d) => [255, 255, 255, d.dimmed ? DIMMED_ALPHA : 255],
                getSize: ORG_ICON_SIZE_METERS * factor,
                sizeUnits: 'meters',
                sizeMinPixels: ORG_ICON_MIN_PIXELS * factor,
                sizeMaxPixels: ORG_ICON_MAX_PIXELS * factor,
                onHover,
                onClick,
                updateTriggers: {getIcon: [secondaryColorHex, primaryColorHex, nodes], getColor: [nodes]},
            })
        const plainIcons = iconLayer('', nodes.filter((node) => !node.emphasized), 1)
        const emphasizedIcons = iconLayer('-emphasized', nodes.filter((node) => node.emphasized), EMPHASIZED_ICON_FACTOR)

        return [arcLayer, selectedArcLayer, plainIcons, emphasizedIcons]
    }
}
