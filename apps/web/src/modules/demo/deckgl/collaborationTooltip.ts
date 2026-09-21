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

    if ('linkCount' in object) {
        const linkCount = object.linkCount as number
        return `${linkCount} collaboration${linkCount === 1 ? '' : 's'}`
    }

    if ('weight' in object && 'source' in object) {
        const weight = object.weight as number
        return `${weight} shared project${weight === 1 ? '' : 's'}`
    }

    return null
}
