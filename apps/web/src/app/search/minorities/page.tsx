import type {Metadata} from 'next'
import {UseCaseSearchPage} from '@/modules/search/UseCaseSearchPage'

export const metadata: Metadata = {
    title: 'Map Minorities – HeritageMonitor',
    description: 'Map research by minorities.',
}

export default function Page() {
    return <UseCaseSearchPage useCaseKey="minorities" />
}
