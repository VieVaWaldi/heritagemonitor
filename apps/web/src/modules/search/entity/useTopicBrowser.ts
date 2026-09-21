'use client'

import {
    topicCountsResponseSchema,
    topicSearchResponseSchema,
    topicTreeResponseSchema,
    type TopicCountEntity,
    type TopicCountsResponse,
    type TopicLevel,
    type TopicTreeNode,
} from '@heritagemonitor/shared'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {apiGet} from '@/common/api/apiClient'
import type {TopicSelectionValue} from '@/common/components'
import {toApiSearchParams, useUrlState, useUrlTopics} from '@/common/url'

const SEARCH_DEBOUNCE_MS = 200
const EMPTY_COUNTS: TopicCountsResponse = {field: {}, subfield: {}, topic: {}}
const EMPTY_IDS: ReadonlySet<string> = new Set()

/**
 * The topic hierarchy is the same 4,516 rows for every user and every page, so
 * it is fetched once per browser session and shared. A module-level promise,
 * not React state: several components (the modal, and the label lookup every
 * panel uses for Lucy) want it, and none of them should trigger its own
 * request.
 */
let treePromise: Promise<TopicTreeNode[]> | null = null

function loadTree(): Promise<TopicTreeNode[]> {
    treePromise ??= apiGet('/v1/topics/tree', topicTreeResponseSchema)
        .then((response) => response.tree)
        .catch((error: unknown) => {
            // A failed load must not be cached as "there are no topics".
            treePromise = null
            throw error
        })
    return treePromise
}

/** Flat `level:id -> name`, for chips and for Lucy's parameter descriptions. */
function indexNames(tree: TopicTreeNode[]): Map<string, string> {
    const names = new Map<string, string>()
    const walk = (nodes: TopicTreeNode[]) => {
        for (const node of nodes) {
            names.set(`${node.level}:${node.id}`, node.name)
            walk(node.children)
        }
    }
    walk(tree)
    return names
}

/**
 * Topic names by id, for anything that shows a selection outside the modal —
 * the filter pill, and Lucy's "all active page parameters" line, which must
 * say "Media Influence and Politics" rather than "13718".
 */
export function useTopicNames(): (level: TopicLevel, id: string) => string {
    const [names, setNames] = useState<Map<string, string>>(new Map())

    useEffect(() => {
        let active = true
        loadTree()
            .then((tree) => {
                if (active) setNames(indexNames(tree))
            })
            .catch(() => {})
        return () => {
            active = false
        }
    }, [])

    return useCallback((level: TopicLevel, id: string) => names.get(`${level}:${id}`) ?? id, [names])
}

/**
 * Everything the topics modal needs: the tree, the counts for the caller's
 * CURRENT search, the tolerant name search, and the selection (which lives in
 * the URL like every other filter).
 *
 * `entity` is what makes this reusable — the counts endpoint aggregates over
 * whichever entity is asking, so experts and funding can open the same modal
 * later by passing their own.
 */
export function useTopicBrowser(entity: TopicCountEntity, open: boolean) {
    const {params} = useUrlState()
    const searchParams = toApiSearchParams(params)
    const {selection, count: selectedCount, atCap, maxTopics, setSelection} = useUrlTopics()

    const [tree, setTree] = useState<TopicTreeNode[]>([])
    // Tagged with the request they answer, so "are these the counts for what
    // is on screen now" is derived rather than tracked with a loading flag
    // set inside the effect.
    const [fetchedCounts, setFetchedCounts] = useState<{key: string; counts: TopicCountsResponse} | null>(null)
    const [searchText, setSearchText] = useState('')
    const [searchResult, setSearchResult] = useState<{query: string; matched: Set<string>; expanded: Set<string>} | null>(null)
    const [manualExpandedIds, setManualExpandedIds] = useState<ReadonlySet<string>>(new Set())

    const countsKey = `${entity}?${searchParams}`
    const counts = fetchedCounts?.key === countsKey ? fetchedCounts.counts : EMPTY_COUNTS
    const loading = open && fetchedCounts?.key !== countsKey

    useEffect(() => {
        if (!open) return
        let active = true
        loadTree()
            .then((loaded) => {
                if (active) setTree(loaded)
            })
            .catch(() => {})
        return () => {
            active = false
        }
    }, [open])

    // Counts follow the page: a new query, filter or corpus changes what
    // choosing a topic would give you, so the numbers have to change with it.
    // The api ignores the topic params themselves.
    useEffect(() => {
        if (!open) return

        const controller = new AbortController()
        apiGet(`/v1/topics/counts?${searchParams}&entity=${entity}`, topicCountsResponseSchema, {signal: controller.signal})
            .then((response) => setFetchedCounts({key: countsKey, counts: response}))
            .catch(() => {})

        return () => controller.abort()
    }, [open, entity, searchParams, countsKey])

    // The search does not filter the tree — it OPENS it. The matched nodes are
    // highlighted and their ancestors expanded, so a hit is shown in the place
    // it actually occupies in the hierarchy.
    const trimmedSearch = searchText.trim()

    useEffect(() => {
        if (!trimmedSearch) return

        const controller = new AbortController()
        const timer = setTimeout(() => {
            apiGet(`/v1/topics/search?q=${encodeURIComponent(trimmedSearch)}`, topicSearchResponseSchema, {
                signal: controller.signal,
            })
                .then((response) =>
                    setSearchResult({
                        query: trimmedSearch,
                        matched: new Set(response.hits.map((hit) => hit.id)),
                        // Ancestors of every hit: what the tree has to open so
                        // the match is visible where it actually sits.
                        expanded: new Set(
                            response.hits.flatMap((hit) =>
                                [hit.fieldId, hit.subfieldId].filter((id): id is string => id !== null),
                            ),
                        ),
                    }),
                )
                .catch(() => {})
        }, SEARCH_DEBOUNCE_MS)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [trimmedSearch])

    // Derived, so clearing the box needs no state write and a stale result for
    // an older query can never be shown against a newer one.
    const current = trimmedSearch && searchResult?.query === trimmedSearch ? searchResult : null
    const matchedIds: ReadonlySet<string> = current?.matched ?? EMPTY_IDS
    const searchExpandedIds: ReadonlySet<string> = current?.expanded ?? EMPTY_IDS

    // What the search opened, plus whatever the user opened by hand. Kept
    // apart so clearing the search collapses only the search's own expansion.
    const expandedIds = useMemo(
        () => new Set([...searchExpandedIds, ...manualExpandedIds]),
        [searchExpandedIds, manualExpandedIds],
    )

    const toggleExpanded = useCallback((id: string) => {
        setManualExpandedIds((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
        // An id the search expanded must also be closable: drop it from the
        // search's own set so the manual toggle decides from here on.
        setSearchResult((result) => {
            if (!result?.expanded.has(id)) return result
            const expanded = new Set(result.expanded)
            expanded.delete(id)
            return {...result, expanded}
        })
    }, [])

    const toggle = useCallback(
        (level: TopicLevel, id: string) => {
            const current = selection[level]
            const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
            setSelection({...selection, [level]: next})
        },
        [selection, setSelection],
    )

    const clear = useCallback(() => setSelection({topic: [], subfield: [], field: []}), [setSelection])

    return {
        tree,
        counts,
        loading,
        selection: selection as TopicSelectionValue,
        selectedCount,
        atCap,
        maxTopics,
        toggle,
        clear,
        searchText,
        setSearchText,
        matchedIds,
        expandedIds,
        toggleExpanded,
    }
}
