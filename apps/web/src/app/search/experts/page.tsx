import type {Metadata} from 'next'
import {UseCaseSearchPage} from '@/modules/search/UseCaseSearchPage'

export const metadata: Metadata = {
    title: 'Find Experts – HeritageMonitor',
    description: 'Find someone to help you.',
}

export default function Page() {
    return <UseCaseSearchPage useCaseKey="findExperts" />
}
