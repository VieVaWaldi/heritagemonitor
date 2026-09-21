import type {Metadata} from 'next'
import {BreadcrumbsPage} from '@/modules/monitoring/BreadcrumbsPage'

export const metadata: Metadata = {
    title: 'Breadcrumbs – HeritageMonitor',
    description: 'The last 100 pages visitors opened.',
}

export default function Page() {
    return <BreadcrumbsPage />
}
