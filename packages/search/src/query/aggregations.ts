export interface TermsAggregation {
    terms: {
        field: string
        size: number
        shard_size: number
        order?: Record<string, 'asc' | 'desc'>
    }
}

/**
 * A terms aggregation with an EXPLICIT `shard_size` — use this for every
 * facet / experts / network / funding aggregation, never a bare `terms`.
 *
 * With 2+ shards (works has 4) the default shard_size (`size * 1.5 + 10`)
 * makes counts approximate: measured on the real-data sample, 5 of 50 topic
 * counts came back 1-2 too low; `shard_size` 500 made all of them exact. The
 * extra shard work is a few hundred buckets. On a 1-shard index (projects,
 * organisations, grants, minorities) counts are exact either way and this is
 * a no-op — which is the point: the caller never has to know the shard count.
 * See SERVING_DESIGN.md section 6.3c.
 */
export function termsAgg(
    field: string,
    size: number,
    options: {shardSize?: number; order?: Record<string, 'asc' | 'desc'>} = {},
): TermsAggregation {
    return {
        terms: {
            field,
            size,
            shard_size: options.shardSize ?? Math.max(size * 10, 500),
            ...(options.order ? {order: options.order} : {}),
        },
    }
}

export interface HistogramAggregation {
    histogram: {field: string; interval: number; min_doc_count: number}
}

/**
 * Counts per bucket of a numeric field — the year histogram behind the year
 * filter. `min_doc_count: 1` drops the empty years between sparse ones, so a
 * range of 80 years does not become 80 bars most of which are zero.
 */
export function histogramAgg(field: string, interval = 1): HistogramAggregation {
    return {histogram: {field, interval, min_doc_count: 1}}
}

export interface TermsBucket {
    key: string | number | boolean
    key_as_string?: string
    doc_count: number
}

export interface TermsAggregationResult {
    buckets: TermsBucket[]
}

/** `{field: {value: count}}` from a response's aggregations, dropping empty buckets. */
export function toFacetDistribution(
    aggregations: Record<string, TermsAggregationResult> | undefined,
): Record<string, Record<string, number>> {
    if (!aggregations) return {}
    return Object.fromEntries(
        Object.entries(aggregations).map(([field, agg]) => [
            field,
            Object.fromEntries(agg.buckets.map((bucket) => [bucket.key_as_string ?? String(bucket.key), bucket.doc_count])),
        ]),
    )
}
