'use client'

import {MAX_URL_TOPICS} from '@heritagemonitor/shared'
import {useCallback, useMemo} from 'react'
import {readTopicSelection, topicSelectionPatch, topicSelectionSize, type TopicSelection} from './codecs'
import {useUrlState} from './useUrlState'

/**
 * The topic-tree selection: three levels (`topic`, `subfield`, `field`) that
 * share one cap of MAX_URL_TOPICS, because they are one choice made in one
 * control. Step 2 only writes leaf topics from the facet list; the topics
 * modal will write all three, which is why the whole selection is handled
 * here rather than as three unrelated filters.
 */
export function useUrlTopics() {
    const {params, update} = useUrlState()

    const selection = useMemo(() => readTopicSelection(params), [params])
    const count = topicSelectionSize(selection)
    const atCap = count >= MAX_URL_TOPICS

    const setSelection = useCallback((next: TopicSelection) => update(topicSelectionPatch(next)), [update])

    const setTopics = useCallback(
        (topics: string[]) => setSelection({...selection, topic: topics}),
        [selection, setSelection],
    )

    return {selection, count, atCap, maxTopics: MAX_URL_TOPICS, setSelection, setTopics}
}
