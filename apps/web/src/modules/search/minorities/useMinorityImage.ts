'use client'

import {useEffect, useState, useTransition} from 'react'

const THUMBNAIL_WIDTH = 200

interface WikidataClaimsResponse {
    claims?: {
        P18?: Array<{mainsnak?: {datavalue?: {value?: string}}}>
    }
}

function commonsFilePathUrl(filename: string): string {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${THUMBNAIL_WIDTH}`
}

export interface MinorityImageState {
    imageUrl: string | null
    loading: boolean
}

// Fetches the selected group's Wikidata "image" claim (P18) directly from
// Wikidata's public API — a third-party service, not our own data store, so
// this doesn't cross the apps/web -> apps/api boundary (see CLAUDE.md). Most
// groups have no P18 claim at all (verified against real qids) — callers get
// null rather than a broken <img>.
export function useMinorityImage(qid: string | null): MinorityImageState {
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [loading, startTransition] = useTransition()

    // Clears the previous group's image as soon as qid changes, rather than
    // leaving it on screen mislabeled until the new (slower, third-party)
    // fetch resolves — adjusted during render, not an effect, per
    // useUseCaseSearch's own prevUrlQuery pattern.
    const [prevQid, setPrevQid] = useState(qid)
    if (qid !== prevQid) {
        setPrevQid(qid)
        setImageUrl(null)
    }

    useEffect(() => {
        if (!qid) return

        const controller = new AbortController()
        startTransition(async () => {
            try {
                const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&property=P18&entity=${encodeURIComponent(qid)}&format=json&origin=*`
                const response = await fetch(url, {signal: controller.signal})
                const data = (await response.json()) as WikidataClaimsResponse
                const filename = data.claims?.P18?.[0]?.mainsnak?.datavalue?.value
                setImageUrl(filename ? commonsFilePathUrl(filename) : null)
            } catch {
                setImageUrl(null)
            }
        })

        return () => controller.abort()
    }, [qid])

    return {imageUrl, loading}
}
