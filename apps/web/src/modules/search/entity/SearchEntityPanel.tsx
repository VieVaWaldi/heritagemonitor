'use client'

import Box from '@mui/material/Box'
import type {ComponentType} from 'react'
import {ENTITIES, type EntityKey} from '@/common/catalog'
import {Text} from '@/common/text'
import {useUrlEntity} from '@/common/url'
import {ProjectsResultsPanel} from '../projects/ProjectsResultsPanel'

/**
 * `/search` is the one use case with several entities behind it (`?e=`), so
 * it needs a router the other routes do not. Entities without a panel yet
 * fall through to a placeholder rather than a blank page.
 *
 * Kept here, next to the panels it references, for the same reason
 * resultsPanelRegistry.ts is not a field on UseCase: common/catalog must not
 * import feature components (apps/web/RULES.md #3).
 */
const PANEL_BY_ENTITY: Partial<Record<EntityKey, ComponentType>> = {
    projects: ProjectsResultsPanel,
}

export function SearchEntityPanel() {
    const {entity} = useUrlEntity()
    const Panel = PANEL_BY_ENTITY[entity]

    if (!Panel) {
        const label = ENTITIES.find((option) => option.key === entity)?.label ?? entity
        return (
            <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Text variant="body1" color="text.secondary">
                    {label} search is coming soon.
                </Text>
            </Box>
        )
    }

    // key={entity}: switching entity must start the next panel from scratch
    // (its own sort options, its own selection) rather than reusing the
    // previous one's state through a same-position remount.
    return <Panel key={entity} />
}
