// Lucy's fetch tool is allowlisted by HOSTNAME, and a doi.org URL is not a
// host that serves anything: it redirects to whichever publisher owns the
// record. So a DOI-only source is unfetchable — measured, not assumed.
//
// The web side already avoids this wherever it can (see shared's
// `fetchableSources`: a doi.org link is dropped whenever a direct one exists),
// so by the time a DOI reaches here it IS the only link the work has. This
// resolves it with ONE request that reads the `Location` header and nothing
// else, and adds the resolved host to the allowlist.
//
// Deliberately small: one hop, no page fetch, hard caps, and any failure
// silently falls back to today's behaviour.

/** Only ever resolve these; everything else is already a real host. */
const DOI_HOSTS = new Set(['doi.org', 'dx.doi.org'])

/** At most this many resolutions per chat request, however many DOIs are listed. */
const MAX_RESOLUTIONS = 3

const PER_RESOLUTION_TIMEOUT_MS = 1_500
const TOTAL_BUDGET_MS = 2_000

/** A DOI's publisher does not change; a failure might, so it is forgotten sooner. */
const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000
const FAILURE_TTL_MS = 10 * 60 * 1000
const MAX_CACHE_ENTRIES = 2_000

interface CacheEntry {
    host: string | null
    expiresAt: number
}

const cache = new Map<string, CacheEntry>()

function readCache(url: string): CacheEntry | undefined {
    const entry = cache.get(url)
    if (!entry) return undefined
    if (entry.expiresAt < Date.now()) {
        cache.delete(url)
        return undefined
    }
    return entry
}

function writeCache(url: string, host: string | null): void {
    // Bounded, oldest-first (Map keeps insertion order) — a chat server must
    // not grow a map forever because someone pasted a lot of DOIs.
    if (cache.size >= MAX_CACHE_ENTRIES) {
        const oldest = cache.keys().next().value
        if (oldest !== undefined) cache.delete(oldest)
    }
    cache.set(url, {host, expiresAt: Date.now() + (host ? SUCCESS_TTL_MS : FAILURE_TTL_MS)})
}

export function isDoiUrl(url: string): boolean {
    try {
        return DOI_HOSTS.has(new URL(url).hostname.toLowerCase())
    } catch {
        return false
    }
}

const PRIVATE_IPV4 =
    /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/u
const LOCAL_SUFFIXES = ['.local', '.internal', '.localdomain', '.home.arpa']

/**
 * Whether a redirect target is safe to put on the allowlist.
 *
 * The `Location` header comes from outside, and whatever host lands on the
 * allowlist is a host the fetch tool may then be asked to read — so this
 * refuses anything that is not a public, named, http(s) host: no IP literals
 * (which is how an SSRF target is usually written), no loopback or private
 * ranges, no `.local`/`.internal` names, and no credentials in the URL.
 */
export function isPublicHttpHost(rawUrl: string): boolean {
    let url: URL
    try {
        url = new URL(rawUrl)
    } catch {
        return false
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    if (url.username || url.password) return false

    const host = url.hostname.toLowerCase()
    if (!host || host === 'localhost') return false
    // An IP literal is never a legitimate publisher and is the usual shape of
    // an SSRF target. Bracketed IPv6 included.
    if (host.startsWith('[')) return false
    if (/^\d{1,3}(\.\d{1,3}){3}$/u.test(host)) return false
    if (PRIVATE_IPV4.test(host)) return false
    if (LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) return false
    // A public name has a dot; a bare label is an intranet host.
    if (!host.includes('.')) return false

    return true
}

export type FetchLike = (url: string, init: RequestInit) => Promise<{status: number; headers: {get(name: string): string | null}}>

/**
 * One hop. HEAD first because it costs the publisher nothing; some reject it,
 * so a 405/501 retries as GET — still with `redirect: 'manual'`, so the body
 * is never downloaded and the publisher's page is never fetched by us.
 */
async function resolveOnce(url: string, fetchImpl: FetchLike, signal: AbortSignal): Promise<string | null> {
    const attempt = async (method: 'HEAD' | 'GET') => fetchImpl(url, {method, redirect: 'manual', signal})

    let response = await attempt('HEAD')
    if (response.status === 405 || response.status === 501) response = await attempt('GET')

    if (response.status < 300 || response.status >= 400) return null

    const location = response.headers.get('location')
    if (!location) return null

    const target = new URL(location, url).toString()
    if (!isPublicHttpHost(target)) return null

    return new URL(target).hostname.toLowerCase()
}

/**
 * The publisher hosts behind a set of source URLs, for the fetch allowlist.
 * Non-DOI URLs are ignored (they are already real hosts); failures, timeouts
 * and unsafe targets simply yield nothing, which leaves the caller exactly
 * where it was before.
 */
export async function resolveDoiHosts(
    urls: readonly string[],
    {fetchImpl = globalThis.fetch as unknown as FetchLike, now = Date.now}: {fetchImpl?: FetchLike; now?: () => number} = {},
): Promise<string[]> {
    const doiUrls = [...new Set(urls.filter(isDoiUrl))].slice(0, MAX_RESOLUTIONS)
    if (doiUrls.length === 0) return []

    const resolved: string[] = []
    const pending: string[] = []

    for (const url of doiUrls) {
        const cached = readCache(url)
        if (cached) {
            if (cached.host) resolved.push(cached.host)
        } else {
            pending.push(url)
        }
    }

    if (pending.length > 0) {
        const deadline = now() + TOTAL_BUDGET_MS
        const results = await Promise.all(
            pending.map(async (url) => {
                const controller = new AbortController()
                const budget = Math.min(PER_RESOLUTION_TIMEOUT_MS, Math.max(0, deadline - now()))
                const timer = setTimeout(() => controller.abort(), budget)
                timer.unref?.()
                try {
                    const host = await resolveOnce(url, fetchImpl, controller.signal)
                    writeCache(url, host)
                    return host
                } catch {
                    // Timed out, refused, unreachable: remembered briefly so a
                    // dead DOI is not retried on every message.
                    writeCache(url, null)
                    return null
                } finally {
                    clearTimeout(timer)
                }
            }),
        )
        for (const host of results) if (host) resolved.push(host)
    }

    return [...new Set(resolved)]
}

/** Test seam: the cache is process-wide. */
export function clearDoiCache(): void {
    cache.clear()
}
