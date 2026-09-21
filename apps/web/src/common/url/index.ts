// The URL is the source of truth for everything a copied link has to
// reproduce: the query, the corpus, the filters, the sort, the page, the
// selected row and its active tab. All of the parsing, writing and history
// policy lives in this folder — modules import hooks, never param names.

export {
    MAX_VALUES_PER_PARAM,
    PAGE_PRESERVING_PARAMS,
    SEARCH_PARAM,
    WEB_ONLY_PARAMS,
    applyPatch,
    buildSearchUrl,
    patchInvalidatesPage,
    readId,
    readList,
    readOneOf,
    readOptionalOneOf,
    readPage,
    readText,
    toApiSearchParams,
    toQueryString,
} from './codecs'
export type {SearchParamName, SearchUrlParams, UrlParamValue, UrlPatch} from './codecs'

export {useUrlState} from './useUrlState'
export type {UrlHistoryMode, UrlState, UrlUpdateOptions} from './useUrlState'

export {useUrlCorpus} from './useUrlCorpus'
export {useUrlEntity} from './useUrlEntity'
export {useUrlPage} from './useUrlPage'
export {useUrlQueryDraft} from './useUrlQueryDraft'
export {useUrlSelection} from './useUrlSelection'
export {useUrlSort} from './useUrlSort'
export {useUrlTab} from './useUrlTab'
