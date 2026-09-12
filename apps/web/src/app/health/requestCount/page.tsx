import type {Metadata} from 'next'
import {RequestCountPage} from '@/modules/monitoring/RequestCountPage'

export const metadata: Metadata = {
    title: 'Request Count – HeritageMonitor',
    description: 'Request volume per api route.',
}

export default function Page() {
    return <RequestCountPage/>
}
