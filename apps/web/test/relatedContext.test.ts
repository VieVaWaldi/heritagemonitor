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

test('related paths are the ones the tabs use, page 1', () => {
    assert.equal(relatedPaths.works('projects', 'p 1', 1, 'c=dch'), '/v1/projects/p%201/works?page=1&c=dch')
    assert.equal(relatedPaths.projectOrganisations('9', 1), '/v1/projects/9/organisations?page=1')
    assert.equal(relatedPaths.grantProjects('f::p', 'dch', 1, 'years=2019-2025'), '/v1/projects/search?years=2019-2025&stream=f%3A%3Ap&page=1&c=dch')
    assert.equal(relatedPaths.grantOrganisations('g', undefined), '/v1/grants/g/organisations')
    assert.equal(relatedPaths.expertWorks('o', 1, 'dch', ''), '/v1/organisations/o/works?page=1&c=dch')
})
