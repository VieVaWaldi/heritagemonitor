import type {Metadata} from 'next'
import {UseCaseSearchPage} from '@/modules/search/UseCaseSearchPage'

export const metadata: Metadata = {
    title: 'Search – HeritageMonitor',
    description: 'Search across projects, works, organisations and grants.',
}

export default function Page() {
    return <UseCaseSearchPage useCaseKey="search" />
}
