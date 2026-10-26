'use client'

import type {QueryNetworkResponse} from '@heritagemonitor/shared'
import {useMemo} from 'react'
import {useTopicNames} from '../entity/useTopicBrowser'
import {buildClusterModel, clusterTitles} from './clusters'

/**
 * The clusters of a query network and their titles. The model is computed once
 * per network (Louvain over at most 300 edges is milliseconds, and it is
 * deterministic); titles are recomputed when the topic names arrive, because a
 * cluster is named after its top topic and the names load separately.
 */
export function useClusterModel(network: QueryNetworkResponse) {
    const topicName = useTopicNames()
    const model = useMemo(() => buildClusterModel(network), [network])
    const titles = useMemo(
        () =>
            clusterTitles(model.clusters, network.nodes, (topicId) => {
                const name = topicName('topic', topicId)
                // An id it does not know comes back unchanged: not a name.
                return name === topicId ? null : name
            }),
        [model, network.nodes, topicName],
    )
    return {model, titles}
}
