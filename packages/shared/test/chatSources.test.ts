import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first).
import {bestFetchableSource, fetchableSources} from '../dist/chatSources.js'
import {organisationLinks, projectLinks, workLinks} from '../dist/links.js'

const PDF = {label: 'PDF', url: 'https://repositori.irta.cat/x.pdf'}
const DOI = {label: 'DOI', url: 'https://doi.org/10.1016/j.compag.2018.02.016'}
const CORDIS = {label: 'CORDIS', url: 'https://cordis.europa.eu/project/id/287841'}
const OPENAIRE = {label: 'OpenAIRE', url: 'https://explore.openaire.eu/search/project?projectId=x'}

test('a doi.org link is dropped whenever something direct exists', () => {
    // The whole point: web_fetch is allowlisted by hostname, and doi.org
    // redirects to a publisher host that is therefore not allowed.
    assert.deepEqual(fetchableSources([DOI, PDF]), [PDF])
    assert.deepEqual(fetchableSources([DOI, CORDIS, OPENAIRE]), [CORDIS, OPENAIRE])
})

test('…but it is still offered when it is all there is', () => {
    assert.deepEqual(fetchableSources([DOI]), [DOI])
})

test('direct links come in order of how useful they are to read', () => {
    assert.deepEqual(
        fetchableSources([OPENAIRE, {label: 'Website', url: 'https://example.org'}, CORDIS, PDF]).map((link) => link.label),
        ['PDF', 'CORDIS', 'Website', 'OpenAIRE'],
    )
})

test('dx.doi.org counts as the same redirector', () => {
    assert.deepEqual(fetchableSources([{label: 'DOI', url: 'http://dx.doi.org/10.1/2'}, PDF]), [PDF])
})

test('an unknown label sorts after the known ones but ahead of a redirect', () => {
    const custom = {label: 'Repository', url: 'https://repo.example.org/1'}
    assert.deepEqual(fetchableSources([DOI, custom, PDF]).map((link) => link.label), ['PDF', 'Repository'])
})

test('bestFetchableSource picks the one link a listed row contributes', () => {
    assert.deepEqual(bestFetchableSource([DOI, PDF]), PDF)
    assert.equal(bestFetchableSource([]), null)
})

test('end to end: the real link helpers produce fetchable orders', () => {
    // A work with a PDF: the PDF, never the DOI.
    assert.deepEqual(
        fetchableSources(
            workLinks({
                pdf_url: 'https://repositori.irta.cat/x.pdf',
                landing_url: 'https://doi.org/10.1016/j.compag.2018.02.016',
                doi: '10.1016/j.compag.2018.02.016',
            }),
        ).map((link) => link.label),
        ['PDF'],
    )
    // An FP7 project: CORDIS and OpenAIRE, both direct.
    assert.deepEqual(
        fetchableSources(projectLinks({grantId: '287841', funder: ['EC'], programme: ['FP7'], openaireId: 'corda_______::x'})).map(
            (link) => link.label,
        ),
        ['CORDIS', 'OpenAIRE'],
    )
    // An H2020 project: the DOI drops out, CORDIS carries it.
    assert.deepEqual(
        fetchableSources(projectLinks({doi: '10.3030/732942', grantId: '732942', funder: ['EC'], programme: ['H2020']})).map(
            (link) => link.label,
        ),
        ['CORDIS'],
    )
    // A non-EC project whose only link is a DOI keeps it.
    assert.deepEqual(fetchableSources(projectLinks({doi: '10.55776/grw5', funder: ['FWF']})).map((link) => link.label), ['DOI'])
    // An organisation: its own site first, then the registries.
    assert.deepEqual(
        fetchableSources(organisationLinks({rorId: '05hkkdn48', websiteUrl: 'https://www.fraunhofer.de', wikiId: 'Q167972'})).map(
            (link) => link.label,
        ),
        ['Website', 'ROR', 'Wikidata'],
    )
})
