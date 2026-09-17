'use client'

import {useEffect, useState, useTransition} from 'react'
import {minorityDtoSchema, type MinorityDto} from '@heritagemonitor/shared'
import {apiGet} from '@/common/api/apiClient'

export interface SelectedMinorityState {
    selectedQid: string | null
    minority: MinorityDto | null
    loading: boolean
    select: (qid: string) => void
}

// Local state only for v1 — not URL-synced. Every caller is a result row,
// which is guaranteed to reference a real indexed document (a subgroup row
// no longer calls this — see MinoritySubgroupsTab), so there's no
// found/not-found ambiguity to handle here.
export function useSelectedMinority(): SelectedMinorityState {
    const [qid, setQid] = useState<string | null>(null)
    const [minority, setMinority] = useState<MinorityDto | null>(null)
    // useTransition, not a manually-managed loading flag, so nothing here
    // calls setState synchronously inside the effect body — see
    // useMinoritySearch's own comment on the same pattern.
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!qid) return

        const controller = new AbortController()
        startTransition(async () => {
            try {
                const doc = await apiGet(`/v1/minorities/${encodeURIComponent(qid)}`, minorityDtoSchema, {
                    signal: controller.signal,
                })
                setMinority(doc)
            } catch {
                setMinority(null)
            }
        })

        return () => controller.abort()
    }, [qid])

    // Derived rather than reset in the effect above — no state write needed
    // for the "nothing selected" case at all.
    return {selectedQid: qid, minority: qid ? minority : null, loading, select: setQid}
}
