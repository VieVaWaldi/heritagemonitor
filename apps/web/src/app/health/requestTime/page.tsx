import type {Metadata} from 'next'
import {RequestTimePage} from '@/modules/monitoring/RequestTimePage'

export const metadata: Metadata = {
    title: 'Request Time – HeritageMonitor',
    description: 'Request latency over time, per api route.',
}

export default function Page() {
    return <RequestTimePage />
}
