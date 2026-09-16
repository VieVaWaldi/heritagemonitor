'use client'

import {usePathname} from 'next/navigation'
import {USE_CASES} from '@/common/catalog'

export interface ActiveUseCase {
    useCaseKey?: string
    subUseCaseKey?: string
}

function routeMatches(pathname: string, route: string): boolean {
    return pathname === route || pathname.startsWith(`${route}/`)
}

// Which UseCase/SubUseCase (if any) the current route belongs to, read
// straight from the URL rather than local UI state — the longest matching
// route wins, so a SubUseCase's more specific route (e.g.
// '/search/collaboration/organisationNetwork') is preferred over a
// UseCase's own, shorter one (e.g. '/search'), which would otherwise match
// as a prefix of every other /search route too. Lets HMMenu (and anything
// else) mirror HeroPage's selection state (see
// modules/home/hooks/useHeroSelection) against wherever the user actually
// is, instead of duplicating that selection logic.
export function useActiveUseCase(): ActiveUseCase {
    const pathname = usePathname()

    let best: {route: string; useCaseKey: string; subUseCaseKey?: string} | undefined

    for (const useCase of USE_CASES) {
        const route = useCase.action?.route
        if (route && routeMatches(pathname, route) && (!best || route.length > best.route.length)) {
            best = {route, useCaseKey: useCase.key}
        }

        for (const subUseCase of useCase.subUseCases ?? []) {
            const subRoute = subUseCase.action.route
            if (subRoute && routeMatches(pathname, subRoute) && (!best || subRoute.length > best.route.length)) {
                best = {route: subRoute, useCaseKey: useCase.key, subUseCaseKey: subUseCase.key}
            }
        }
    }

    return {useCaseKey: best?.useCaseKey, subUseCaseKey: best?.subUseCaseKey}
}
