import {createRequire} from 'node:module'

// English Wikipedia articles for minority groups, by Wikidata id.
//
// Built in hm_pipeline from Wikidata SITELINKS (not a title guess), so a hit
// is an article that really exists. 210 of the 278 groups have one; the rest
// genuinely have no English article and must fall back to Wikidata.
//
// Shipped as reference data next to the index rather than fetched at request
// time, exactly like topics.json: it is small, it never changes between
// deploys, and a per-request call to Wikidata would put a third party on the
// critical path of a detail view.

interface WikipediaArticle {
    title: string
    url: string
}

// createRequire, not a JSON import: the api is built as ESM to plain JS, and
// import assertions would have to survive the tsc/Node combination. postbuild
// copies the file next to the compiled module (see apps/api/package.json).
const require = createRequire(import.meta.url)
const articles = require('./minorityWikipedia.json') as Record<string, WikipediaArticle>

/**
 * The English Wikipedia URL for a group, or null when it has no article.
 *
 * Null is a real answer here, not a failure: the UI shows Wikidata alone for
 * those groups, and Lucy is given no source at all rather than a Wikidata page
 * she cannot read prose from.
 */
export function minorityWikipediaUrl(qid: string): string | null {
    return articles[qid]?.url ?? null
}

/** How many groups have an article — surfaced by the monitoring/health view. */
export function minorityWikipediaCount(): number {
    return Object.keys(articles).length
}
