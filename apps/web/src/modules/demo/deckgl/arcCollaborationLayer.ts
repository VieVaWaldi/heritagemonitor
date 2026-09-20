import {CompositeLayer, type PickingInfo} from '@deck.gl/core'
import {ArcLayer, IconLayer} from '@deck.gl/layers'
import type {CollaborationEdge} from '@heritagemonitor/shared'
import {hexToRgb} from './colorUtils'
import {institutionIconUrl} from './icons'
import {institutionPoints} from './institutionPoints'

// Arcs between collaborating institutions + one icon per institution.
// CompositeLayer pattern ported from digicher_webinterface's
// TopicNetworkLayer — deck.gl only calls onHover/onClick on the top-level
// layer, never on sublayers set up inside renderLayers(), so both sublayers
// share the single onHover/onClick given to this outer layer.

const MIN_ARC_WIDTH = 1
const MAX_ARC_WIDTH = 6
const HUB_EDGE_COUNT_THRESHOLD = 2

export interface ArcCollaborationLayerProps {
    id: string
    data: CollaborationEdge[]
    primaryColorHex: string
    secondaryColorHex: string
    onHover?: (info: PickingInfo) => void
    onClick?: (info: PickingInfo) => void
}

export class ArcCollaborationLayer extends CompositeLayer<ArcCollaborationLayerProps> {
    static layerName = 'ArcCollaborationLayer'

    renderLayers() {
        const {data, primaryColorHex, secondaryColorHex, onHover, onClick} = this.props
        if (!data.length) return []

        const primaryColor = hexToRgb(primaryColorHex)
        const secondaryColor = hexToRgb(secondaryColorHex)
        const maxProjectCount = Math.max(1, ...data.map((edge) => edge.project_count))
        const points = institutionPoints(data)

        const arcLayer = new ArcLayer<CollaborationEdge>({
            id: `${this.props.id}-arcs`,
            data,
            getSourcePosition: (d) => d.institution_geolocation,
            getTargetPosition: (d) => d.collaborator_geolocation,
            getSourceColor: primaryColor,
            getTargetColor: secondaryColor,
            getWidth: (d) => MIN_ARC_WIDTH + (d.project_count / maxProjectCount) * (MAX_ARC_WIDTH - MIN_ARC_WIDTH),
            widthMinPixels: MIN_ARC_WIDTH,
            greatCircle: true,
            pickable: true,
            onHover,
            onClick,
        })

        const iconLayer = new IconLayer({
            id: `${this.props.id}-icons`,
            data: points,
            pickable: true,
            getPosition: (d) => d.geolocation,
            getIcon: (d) => ({
                url: institutionIconUrl(d.edgeCount >= HUB_EDGE_COUNT_THRESHOLD ? secondaryColorHex : primaryColorHex),
                width: 64,
                height: 64,
                anchorY: 64,
            }),
            getSize: 400,
            sizeUnits: 'meters',
            sizeMinPixels: 10,
            sizeMaxPixels: 32,
            onHover,
            onClick,
            updateTriggers: {getIcon: [secondaryColorHex, primaryColorHex]},
        })

        return [arcLayer, iconLayer]
    }
}
