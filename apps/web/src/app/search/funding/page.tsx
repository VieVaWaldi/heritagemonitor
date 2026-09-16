import type {Metadata} from 'next'
import {UseCaseSearchPage} from '@/modules/search/UseCaseSearchPage'

export const metadata: Metadata = {
    title: 'Track Funding – HeritageMonitor',
    description: 'Map research by funding.',
}

export default function Page() {
    return <UseCaseSearchPage useCaseKey="funding" />
}
