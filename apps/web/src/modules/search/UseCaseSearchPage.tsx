import {Suspense} from 'react'
import Box from '@mui/material/Box'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {Navbar} from '@/common/components'
import {SearchNav} from './components/SearchNav'

export interface UseCaseSearchPageProps {
    useCaseKey: string
    subUseCaseKey?: string
}

// Shared shell for every /search route: the tall Navbar (with this route's
// ActionBar) plus a placeholder body. Results UI is intentionally not built
// yet — the indices/pipelines behind each UseCase don't exist. Once a given
// UseCase's data is wired up, split its results body out of this shared
// placeholder into its own module/component.
export function UseCaseSearchPage({useCaseKey, subUseCaseKey}: UseCaseSearchPageProps) {
    return (
        <>
            {/* SearchNav reads useSearchParams() (to hydrate q/e) — Next requires
                a Suspense boundary around that or the build bails the page out of
                static rendering. Fallback mirrors its own empty shell so there's
                no layout jump once the real bar hydrates. */}
            <Suspense fallback={<Navbar size="tall" bordered sticky />}>
                <SearchNav useCaseKey={useCaseKey} subUseCaseKey={subUseCaseKey} />
            </Suspense>
            <Box sx={{display: 'flex', justifyContent: 'center', py: fluidUnit(8), px: 3}}>
                <Text variant="body1" sx={{color: 'text.secondary'}}>
                    Results for &ldquo;{useCaseKey}
                    {subUseCaseKey ? `/${subUseCaseKey}` : ''}&rdquo; — coming soon.
                </Text>
            </Box>
        </>
    )
}
