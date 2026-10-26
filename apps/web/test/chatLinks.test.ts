import assert from 'node:assert/strict'
import {test} from 'node:test'
// Imported straight from source: the rule is a pure function, no React.
import {classifyChatLink} from '../src/common/llmchat/chatLinks.ts'

const ORIGIN = 'https://heritagemonitor.org'

test('app routes are internal, and come back router-relative', () => {
    // These are the links Lucy hands out as a table of contents; following one
    // must not reload the page, or her conversation dies with it.
    assert.deepEqual(classifyChatLink('/search?e=works&q=heritage', ORIGIN), {
        kind: 'internal',
        href: '/search?e=works&q=heritage',
    })
    assert.deepEqual(classifyChatLink('/search/minorities', ORIGIN), {kind: 'internal', href: '/search/minorities'})
    assert.deepEqual(classifyChatLink('search?q=x', ORIGIN), {kind: 'internal', href: '/search?q=x'})
})

test('an absolute link to our own origin is still internal', () => {
    assert.deepEqual(classifyChatLink(`${ORIGIN}/search?e=organisations#top`, ORIGIN), {
        kind: 'internal',
        href: '/search?e=organisations#top',
    })
})

test('localhost and production are each internal to themselves', () => {
    assert.equal(classifyChatLink('http://localhost:3000/search', 'http://localhost:3000').kind, 'internal')
    // Same path, different origin: that IS leaving this app.
    assert.equal(classifyChatLink('http://localhost:3000/search', ORIGIN).kind, 'external')
})

test('everything off-origin is external and keeps its absolute URL', () => {
    assert.deepEqual(classifyChatLink('https://doi.org/10.3030/732942', ORIGIN), {
        kind: 'external',
        href: 'https://doi.org/10.3030/732942',
    })
    assert.equal(classifyChatLink('https://cordis.europa.eu/project/id/287841', ORIGIN).kind, 'external')
    // A different port or scheme on the same host is a different origin.
    assert.equal(classifyChatLink('https://heritagemonitor.org:8443/search', ORIGIN).kind, 'external')
    assert.equal(classifyChatLink('http://heritagemonitor.org/search', ORIGIN).kind, 'external')
})

test('non-navigations are left alone rather than hijacked', () => {
    assert.deepEqual(classifyChatLink('#section', ORIGIN), {kind: 'ignore'})
    assert.deepEqual(classifyChatLink('mailto:someone@example.org', ORIGIN), {kind: 'ignore'})
    assert.deepEqual(classifyChatLink('tel:+3212345678', ORIGIN), {kind: 'ignore'})
    assert.deepEqual(classifyChatLink('', ORIGIN), {kind: 'ignore'})
    assert.deepEqual(classifyChatLink(null, ORIGIN), {kind: 'ignore'})
    assert.deepEqual(classifyChatLink('   ', ORIGIN), {kind: 'ignore'})
})

test('a javascript: url is never treated as a navigation', () => {
    assert.deepEqual(classifyChatLink('javascript:alert(1)', ORIGIN), {kind: 'ignore'})
})
