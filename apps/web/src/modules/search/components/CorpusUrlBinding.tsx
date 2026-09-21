'use client'

import {useMemo} from 'react'
import {useCorpusUrlBindingPublisher} from '@/common/catalog'
import {useUrlCorpus} from '@/common/url'

/**
 * Makes the URL the source of truth for the corpus while a /search route is
 * open: the CorpusPanel in the Navbar keeps writing to CorpusContext, and the
 * context defers to this binding (see CorpusContext's own doc comment for why
 * the provider cannot read the URL itself from the root layout).
 *
 * Renders nothing — it exists to be mounted inside the route's Suspense
 * boundary, which is what `useSearchParams()` requires.
 */
export function CorpusUrlBinding() {
    const {corpus, setCorpus} = useUrlCorpus()
    // `setCorpus` is stable (useCallback), so the binding object only changes
    // when the corpus really does — the publisher's effect depends on it.
    const binding = useMemo(() => ({corpus, setCorpus}), [corpus, setCorpus])
    useCorpusUrlBindingPublisher(binding)
    return null
}
