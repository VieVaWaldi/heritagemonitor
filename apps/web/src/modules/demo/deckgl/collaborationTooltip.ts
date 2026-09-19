import type {PickingInfo} from '@deck.gl/core'

// deck.gl's native getTooltip — plain text, no custom hover-panel UI (kept
// deliberately simple, unlike digicher_webinterface's MapTooltip/hover-state
// machinery). Handles the two distinct object shapes the two visualizations
// can hand back: an edge (ArcLayer) or an institution point (IconLayer/ColumnLayer).
export function collaborationTooltip(info: PickingInfo): string | null {
    const object = info.object as Record<string, unknown> | undefined
    if (!object) return null

    if ('institution_id' in object && 'collaborator_id' in object) {
        const count = object.project_count as number
        return `${count} shared project${count === 1 ? '' : 's'}`
    }

    if ('edgeCount' in object && 'projectCount' in object) {
        const edgeCount = object.edgeCount as number
        const projectCount = object.projectCount as number
        return `${edgeCount} collaboration${edgeCount === 1 ? '' : 's'}, ${projectCount} shared project${projectCount === 1 ? '' : 's'}`
    }

    return null
}
