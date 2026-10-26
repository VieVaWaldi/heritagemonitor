import assert from 'node:assert/strict'
import {beforeEach, test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first).
import {clearDoiCache, isDoiUrl, isPublicHttpHost, resolveDoiHosts} from '../dist/modules/llmchat/doiResolver.js'

const response = (status: number, location?: string) => ({
    status,
    headers: {get: (name: string) => (name.toLowerCase() === 'location' && location ? location : null)},
})

beforeEach(() => clearDoiCache())

test('only doi.org urls are ever resolved', () => {
    assert.equal(isDoiUrl('https://doi.org/10.1/2'), true)
    assert.equal(isDoiUrl('http://dx.doi.org/10.1/2'), true)
    assert.equal(isDoiUrl('https://cordis.europa.eu/project/id/1'), false)
    assert.equal(isDoiUrl('not a url'), false)
})

test('a redirect is followed exactly one hop, to its host', async () => {
    let calls = 0
    const hosts = await resolveDoiHosts(['https://doi.org/10.1016/j.compag.2018.02.016'], {
        fetchImpl: async () => {
            calls += 1
            return response(302, 'https://www.sciencedirect.com/science/article/pii/S0168169917308803')
        },
    })
    assert.deepEqual(hosts, ['www.sciencedirect.com'])
    assert.equal(calls, 1, 'one request, and the publisher page is never fetched')
})

test('HEAD is retried as GET when the publisher rejects it', async () => {
    const methods: string[] = []
    const hosts = await resolveDoiHosts(['https://doi.org/10.1/2'], {
        fetchImpl: async (_url, init) => {
            methods.push(String(init.method))
            return methods.length === 1 ? response(405) : response(301, 'https://link.springer.com/article/1')
        },
    })
    assert.deepEqual(methods, ['HEAD', 'GET'])
    assert.deepEqual(hosts, ['link.springer.com'])
})

test('a 4xx or a missing Location resolves to nothing', async () => {
    assert.deepEqual(await resolveDoiHosts(['https://doi.org/10.1/404'], {fetchImpl: async () => response(404)}), [])
    clearDoiCache()
    assert.deepEqual(await resolveDoiHosts(['https://doi.org/10.1/2'], {fetchImpl: async () => response(302)}), [])
})

test('a timeout or a thrown request falls back to nothing, never an error', async () => {
    const hosts = await resolveDoiHosts(['https://doi.org/10.1/slow'], {
        fetchImpl: async () => {
            throw new Error('aborted')
        },
    })
    assert.deepEqual(hosts, [])
})

test('SSRF: a redirect to anything but a public named http(s) host is refused', () => {
    assert.equal(isPublicHttpHost('https://www.sciencedirect.com/x'), true)
    // IP literals are how an SSRF target is usually written.
    assert.equal(isPublicHttpHost('http://127.0.0.1/admin'), false)
    assert.equal(isPublicHttpHost('http://169.254.169.254/latest/meta-data/'), false)
    assert.equal(isPublicHttpHost('http://10.0.0.5/'), false)
    assert.equal(isPublicHttpHost('http://192.168.1.1/'), false)
    assert.equal(isPublicHttpHost('http://172.16.0.1/'), false)
    assert.equal(isPublicHttpHost('http://[::1]/'), false)
    assert.equal(isPublicHttpHost('http://localhost:8080/'), false)
    assert.equal(isPublicHttpHost('http://opensearch.internal/'), false)
    assert.equal(isPublicHttpHost('http://db.local/'), false)
    assert.equal(isPublicHttpHost('http://intranet/'), false, 'a bare label is not public')
    assert.equal(isPublicHttpHost('file:///etc/passwd'), false)
    assert.equal(isPublicHttpHost('https://user:pass@example.org/'), false)
})

test('an unsafe redirect target yields no host', async () => {
    const hosts = await resolveDoiHosts(['https://doi.org/10.1/evil'], {
        fetchImpl: async () => response(302, 'http://169.254.169.254/latest/meta-data/'),
    })
    assert.deepEqual(hosts, [])
})

test('a resolved doi is cached — the second message costs no request', async () => {
    let calls = 0
    const fetchImpl = async () => {
        calls += 1
        return response(302, 'https://www.nature.com/articles/1')
    }
    const url = 'https://doi.org/10.1038/1'
    assert.deepEqual(await resolveDoiHosts([url], {fetchImpl}), ['www.nature.com'])
    assert.deepEqual(await resolveDoiHosts([url], {fetchImpl}), ['www.nature.com'])
    assert.equal(calls, 1)
})

test('a failure is cached too, so a dead DOI is not retried every message', async () => {
    let calls = 0
    const fetchImpl = async () => {
        calls += 1
        return response(404)
    }
    await resolveDoiHosts(['https://doi.org/10.1/dead'], {fetchImpl})
    await resolveDoiHosts(['https://doi.org/10.1/dead'], {fetchImpl})
    assert.equal(calls, 1)
})

test('at most three DOIs are resolved per request, whatever is listed', async () => {
    let calls = 0
    const hosts = await resolveDoiHosts(
        ['https://doi.org/10.1/a', 'https://doi.org/10.1/b', 'https://doi.org/10.1/c', 'https://doi.org/10.1/d', 'https://doi.org/10.1/e'],
        {
            fetchImpl: async (url) => {
                calls += 1
                return response(302, `https://publisher-${encodeURIComponent(url.slice(-1))}.example.org/x`)
            },
        },
    )
    assert.equal(calls, 3)
    assert.equal(hosts.length, 3)
})

test('non-DOI sources are ignored entirely — no request, no change', async () => {
    let calls = 0
    const hosts = await resolveDoiHosts(['https://cordis.europa.eu/project/id/1', 'https://example.org/paper.pdf'], {
        fetchImpl: async () => {
            calls += 1
            return response(302, 'https://elsewhere.example.org/')
        },
    })
    assert.deepEqual(hosts, [])
    assert.equal(calls, 0)
})
