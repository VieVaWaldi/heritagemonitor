'use client'

import {useRecordBreadcrumbs} from './useBreadcrumbs'

/**
 * Renders nothing; records where the visitor goes.
 *
 * Lives in the root layout so every page is seen. It reads `useSearchParams`,
 * so the layout must wrap it in a Suspense boundary — otherwise Next bails
 * every page out of static rendering.
 */
export function BreadcrumbRecorder() {
    useRecordBreadcrumbs()
    return null
}
