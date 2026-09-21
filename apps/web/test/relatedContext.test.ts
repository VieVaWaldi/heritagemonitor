import assert from 'node:assert/strict'
import {test} from 'node:test'
import {
    buildPageContext,
    MAX_FETCHES,
    MAX_SOURCES,
    resolvePageContext,
    type PageContextSource,
} from '../src/common/llmchat/pageContext.ts'
import {relatedPaths} from '../src/modules/search/entity/relatedPaths.ts'

const sources = (n: number, prefix = 's'): PageContextSource[] =>
    Array.from({length: n}, (_, i) => ({label: `${prefix}${i}`, url: `https://example.org/${prefix}${i}`}))

test('offered sources are capped at 60 while the fetch cap stays 20', () => {
    assert.equal(MAX_SOURCES, 60)
    assert.equal(MAX_FETCHES, 20)
    assert.equal(buildPageContext({sections: [], sources: sources(100)}).sources.length, 60)
})

test('a context without lazy part resolves to itself, minus the lazy field', async () => {
    const context = buildPageContext({sections: [{heading: 'H', rows: ['- a']}], sources: sources(2)})
    const resolved = await resolvePageContext(context)
    assert.deepEqual(resolved.lines, ['H', '- a'])
    assert.equal('lazy' in resolved, false)
})

test('lazy sections and sources are appended after the eager ones, deduplicated', async () => {
    const context = buildPageContext({
        sections: [{heading: 'H', rows: ['- a']}],
        sources: sources(2),
        lazy: {
            key: 'k',
            load: async () => ({
                sections: [{heading: 'Works', rows: ['- Work [1] T']}],
                sources: [...sources(1), ...sources(2, 'w')],
            }),
        },
    })
    const resolved = await resolvePageContext(context)
    assert.deepEqual(resolved.lines, ['H', '- a', 'Works', '- Work [1] T'])
    assert.deepEqual(
        resolved.sources.map((source) => source.label),
        ['s0', 's1', 'w0', 'w1'],
    )
})

test('a failing lazy load costs only the extra, never the message', async () => {
    const context = buildPageContext({
        sections: [{heading: 'H', rows: ['- a']}],
        lazy: {key: 'k', load: async () => Promise.reject(new Error('api down'))},
    })
    const resolved = await resolvePageContext(context)
    assert.deepEqual(resolved.lines, ['H', '- a'])
})

test('merged sources never exceed the cap', async () => {
    const context = buildPageContext({
        sections: [],
        sources: sources(30),
        lazy: {key: 'k', load: async () => ({sections: [], sources: sources(50, 'x')})},
    })
    assert.equal((await resolvePageContext(context)).sources.length, 60)
})

const params = (path: string) => new URL(path, 'http://x').searchParams

test('related paths are the ones the tabs use, page 1', () => {
    assert.equal(relatedPaths.projectOrganisations('9', 1), '/v1/projects/9/organisations?page=1')
    assert.equal(relatedPaths.grantOrganisations('g', undefined), '/v1/grants/g/organisations')
    const works = params(relatedPaths.works('projects', 'p 1', 1, 'c=dch'))
    assert.equal(new URL(relatedPaths.works('projects', 'p 1', 1, 'c=dch'), 'http://x').pathname, '/v1/projects/p%201/works')
    assert.equal(works.get('page'), '1')
    assert.equal(works.get('c'), 'dch')
    const grant = params(relatedPaths.grantProjects('f::p', 'dch', 1, 'years=2019-2025'))
    assert.equal(grant.get('stream'), 'f::p')
    assert.equal(grant.get('years'), '2019-2025')
    assert.equal(grant.get('c'), 'dch')
    const expertWorks = params(relatedPaths.expertWorks('o', 1, 'dch', 'bim'))
    assert.equal(expertWorks.get('q'), 'bim')
    assert.equal(expertWorks.get('c'), 'dch')
})

test('every related list that carries the page\'s text asks for the STRICT search only', () => {
    // These hang off a parent's number (an expert's "3 matching projects"); the
    // api's typo fallback would otherwise widen them to "199" on their own.
    const lists = [
        relatedPaths.expertProjects('q=bim&c=science', 'o', 1),
        relatedPaths.expertWorks('o', 1, 'science', 'bim'),
        relatedPaths.grantProjects('f::p', 'science', 1, 'q=bim'),
        relatedPaths.minorityProjects('Q1', 1, 'q=bim'),
        relatedPaths.minorityWorks('Q1', 1, 'q=bim'),
        relatedPaths.works('organisations', 'o', 1, 'q=bim'),
        relatedPaths.works('projects', 'p', 1, 'q=bim'),
    ]
    for (const path of lists) assert.equal(params(path).get('strict'), 'true', path)
    // the parent's own text is still there
    assert.equal(params(relatedPaths.expertProjects('q=bim&c=science', 'o', 1)).get('q'), 'bim')
    assert.equal(params(relatedPaths.expertProjects('q=bim&c=science', 'o', 1)).get('org'), 'o')
})
