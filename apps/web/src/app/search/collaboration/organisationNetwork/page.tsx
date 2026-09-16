import type {Metadata} from 'next'
import {UseCaseSearchPage} from '@/modules/search/UseCaseSearchPage'

export const metadata: Metadata = {
    title: 'Collaboration Network – HeritageMonitor',
    description: 'Map who works with whom, starting from your organisations.',
}

export default function Page() {
    return <UseCaseSearchPage useCaseKey="collaboration" subUseCaseKey="organisationNetwork" />
}
