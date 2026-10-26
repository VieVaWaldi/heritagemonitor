'use client'

import {useMemo} from 'react'
import {URL_PARAM_LABELS, useUrlState} from '@/common/url'
import {useTopicNames} from './useTopicBrowser'
import {relatedFilterCaption, relatedParams} from './relatedParams'

/**
 * Everything a tab list needs from the surrounding page: the params it should
 * forward, and the sentence explaining what it forwarded and what it did not.
 *
 * Both come from the one table in ./relatedParams, so the caption can never
 * describe behaviour the request does not have.
 */
export interface RelatedRequest {
    /** Query string to append to the tab's own request (never includes `page`). */
    search: string
    /** Grey line for the top of the list — empty when there is nothing to say. */
    caption: string
}

export function useRelatedRequest(relation: string): RelatedRequest {
    const {params} = useUrlState()
    const topicName = useTopicNames()
    const key = params.toString()

    return useMemo(() => {
        const current = new URLSearchParams(key)
        return {
            search: relatedParams(relation, current).toString(),
            caption: relatedFilterCaption(relation, current, {
                labelParam: (param) => URL_PARAM_LABELS[param as keyof typeof URL_PARAM_LABELS] ?? param,
                // Topic ids are the one value that is not its own label; "Topic
                // 13718" in an explanation explains nothing.
                labelValue: (param, value) =>
                    param === 'topic' || param === 'subfield' || param === 'field'
                        ? topicName(param as 'topic' | 'subfield' | 'field', value)
                        : value,
            }),
        }
    }, [relation, key, topicName])
}
