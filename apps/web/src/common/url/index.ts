// The URL is the source of truth for everything a copied link has to
// reproduce: the query, the corpus, the filters, the sort, the page, the
// selected row and its active tab. All of the parsing, writing and history
// policy lives in this folder — modules import hooks, never param names.

export {
    EMPTY_TOPIC_SELECTION,
    MAX_VALUES_PER_PARAM,
    URL_PARAM_LABELS,
    PAGE_PRESERVING_PARAMS,
    SEARCH_PARAM,
    WEB_ONLY_PARAMS,
    applyPatch,
    buildEntityLink,
    buildResetPatch,
    buildSearchUrl,
    describeUrlParams,
    patchClearsDetailPage,
    patchClearsSelection,
    patchInvalidatesPage,
    readId,
    readList,
    readOneOf,
    readOptionalOneOf,
    readPage,
    readText,
    readTopicSelection,
    readYears,
    toApiSearchParams,
    toQueryString,
    topicSelectionPatch,
    topicSelectionSize,
    yearsPatchValue,
} from './codecs'
export type {
    DescribeParamsOptions,
    DescribedParam,
    SearchParamName,
    SearchUrlParams,
    TopicSelection,
    UrlParamValue,
    UrlPatch,
} from './codecs'

export {useUrlState} from './useUrlState'
export type {UrlHistoryMode, UrlState, UrlUpdateOptions} from './useUrlState'

export {useUrlCorpus} from './useUrlCorpus'
export {useUrlDetailPage} from './useUrlDetailPage'
export {useUrlEntity} from './useUrlEntity'
export {useUrlFilters} from './useUrlFilters'
export type {UrlFilterValues} from './useUrlFilters'
export {useUrlPage} from './useUrlPage'
export {useUrlQueryDraft} from './useUrlQueryDraft'
export {useUrlSelection} from './useUrlSelection'
export {useUrlSort} from './useUrlSort'
export {useUrlTab} from './useUrlTab'
export {useUrlTopics} from './useUrlTopics'
export {useUrlYears} from './useUrlYears'
