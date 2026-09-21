// Prod index names are bare (`projects`, `organisations`, ...). The optional
// prefix exists so a second set can live beside them on one cluster — an
// alias swap during a reload, or a staging deployment sharing the node.
// Unset (the normal case, dev included) means no prefix at all.
const prefix = process.env.OPENSEARCH_INDEX_PREFIX ?? ''

export function indexName(base: string): string {
    return `${prefix}${base}`
}
