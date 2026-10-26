'use client'

import {CORPUS_KEYS, DEFAULT_CORPUS, type Corpus} from '@heritagemonitor/shared'
import {useCallback} from 'react'
import {readOneOf, SEARCH_PARAM} from './codecs'
import {useUrlState} from './useUrlState'

/**
 * SCI/DCH in the URL. An unknown value falls back to the default rather than
 * erroring: a hand-edited or outdated link must still open the page.
 *
 * Switching corpus changes which documents match, so it is a `push` (back
 * returns to the other corpus) and `useUrlState` drops `page` for us.
 */
export function useUrlCorpus() {
    const {params, update} = useUrlState()
    const corpus = readOneOf<Corpus>(params, SEARCH_PARAM.corpus, CORPUS_KEYS, DEFAULT_CORPUS)

    const setCorpus = useCallback(
        (next: Corpus) => update({[SEARCH_PARAM.corpus]: next}),
        [update],
    )

    return {corpus, setCorpus}
}
