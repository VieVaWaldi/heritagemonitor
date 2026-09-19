import type {Metadata} from 'next'
import {LiveRequestsPage} from '@/modules/monitoring/LiveRequestsPage'

export const metadata: Metadata = {
    title: 'Live Requests – HeritageMonitor',
    description: 'Real-time feed of the last 100 api requests.',
}

export default function Page() {
    return <LiveRequestsPage />
}
