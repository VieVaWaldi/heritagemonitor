import {ColumnLayer} from '@deck.gl/layers'
import type {PickingInfo} from '@deck.gl/core'
import type {CollaborationEdge} from '@heritagemonitor/shared'
import {hexToRgb, lerpRgb} from './colorUtils'
import {institutionPoints, type InstitutionPoint} from './institutionPoints'

const MAX_ELEVATION_METERS = 500_000
const RADIUS_METERS = 4_000
const COLOR_GAMMA = 0.5

export interface InstitutionColumnLayerOptions {
    id: string
    data: CollaborationEdge[]
    lowColorHex: string
    highColorHex: string
    onHover?: (info: PickingInfo) => void
    onClick?: (info: PickingInfo) => void
}

export function createInstitutionColumnLayer({id, data, lowColorHex, highColorHex, onHover, onClick}: InstitutionColumnLayerOptions) {
    const points = institutionPoints(data)
    const low = hexToRgb(lowColorHex)
    const high = hexToRgb(highColorHex)
    const maxProjectCount = Math.max(1, ...points.map((p) => p.projectCount))

    return new ColumnLayer<InstitutionPoint>({
        id,
        data: points,
        pickable: true,
        extruded: true,
        diskResolution: 24,
        radius: RADIUS_METERS,
        getPosition: (d) => d.geolocation,
        getElevation: (d) => Math.pow(d.projectCount / maxProjectCount, COLOR_GAMMA) * MAX_ELEVATION_METERS,
        getFillColor: (d) => [...lerpRgb(low, high, d.projectCount / maxProjectCount), 220],
        onHover,
        onClick,
        material: {ambient: 0.64, diffuse: 0.6, shininess: 32, specularColor: [0, 0, 0]},
    })
}
