'use client'

import {useCallback} from 'react'
import {ENTITIES, type EntityKey} from '@/common/catalog'
import {readOneOf, SEARCH_PARAM} from './codecs'
import {useUrlState} from './useUrlState'

const ENTITY_KEYS = ENTITIES.map((entity) => entity.key)
const DEFAULT_ENTITY: EntityKey = 'projects'

/**
 * Which entity `/search` is searching. Only that route has several entities
 * behind one use case, so this is the one place `e` is interpreted.
 *
 * Switching entity clears the query text too: a query written for projects
 * ("photogrammetry AND heritage") rarely means anything against
 * organisations, and silently re-running it would look like a broken search.
 */
export function useUrlEntity() {
    const {params, update} = useUrlState()
    const entity = readOneOf<EntityKey>(params, SEARCH_PARAM.entity, ENTITY_KEYS, DEFAULT_ENTITY)

    const setEntity = useCallback(
        (next: EntityKey) =>
            update({
                [SEARCH_PARAM.entity]: next,
                [SEARCH_PARAM.query]: null,
                [SEARCH_PARAM.selection]: null,
                [SEARCH_PARAM.tab]: null,
                [SEARCH_PARAM.sort]: null,
                [SEARCH_PARAM.only]: null,
            }),
        [update],
    )

    return {entity, setEntity}
}
