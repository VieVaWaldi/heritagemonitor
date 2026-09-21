import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first), not
// `src/`: this package ships ESM with explicit `.js` specifiers, which Node's
// own TypeScript support does not rewrite back to `.ts`. Testing the built
// entry points is also what every consumer actually imports.
import {projectLinks} from '../dist/links.js'

// Cases mirror the real shapes in the core_v4 `projects` index — see
// HERITAGEMONITOR_PLAN.md section 3.3.

test('H2020 project: DOI and CORDIS', () => {
    assert.deepEqual(
        projectLinks({
            doi: '10.3030/732942',
            grantId: '732942',
            funder: ['EC'],
            programme: ['H2020'],
            openaireId: 'corda__h2020::1c819998149d722b588975acf2bb5838',
        }),
        [
            {label: 'DOI', url: 'https://doi.org/10.3030/732942'},
            {label: 'CORDIS', url: 'https://cordis.europa.eu/project/id/732942'},
            {
                label: 'OpenAIRE',
                url: 'https://explore.openaire.eu/search/project?projectId=corda__h2020%3A%3A1c819998149d722b588975acf2bb5838',
            },
        ],
    )
})

test('Horizon Europe project: same rules as H2020', () => {
    const links = projectLinks({doi: '10.3030/101022163', grantId: '101022163', funder: ['EC'], programme: ['HE']})
    assert.deepEqual(links.map((link) => link.label), ['DOI', 'CORDIS'])
    assert.equal(links[1].url, 'https://cordis.europa.eu/project/id/101022163')
})

test('FP7 project: no DOI in the data, CORDIS is the only way in', () => {
    assert.deepEqual(
        projectLinks({
            grantId: '287841',
            funder: ['EC'],
            programme: ['FP7'],
            openaireId: 'corda_______::caf97d8e4250870c41b7158c5b731862',
        }).map((link) => link.label),
        ['CORDIS', 'OpenAIRE'],
    )
})

test('ERASMUS+ project: EC-funded but the grant id is not a CORDIS id', () => {
    assert.deepEqual(
        projectLinks({grantId: '2019-1-EE01-KA229-051616', funder: ['EC'], programme: ['ERASMUS+']}),
        [],
    )
})

test('ERASMUS+ with a numeric grant id still gets no CORDIS link', () => {
    // ERASMUS+ is not a CORDIS programme, whatever its grant id looks like.
    assert.deepEqual(projectLinks({grantId: '101087250', funder: ['EC'], programme: ['ERASMUS+']}), [])
})

test('NIH project with a DOI: DOI shown, no CORDIS', () => {
    assert.deepEqual(
        projectLinks({
            doi: '10.55776/grw5',
            grantId: '5K01MH065454-05',
            funder: ['NIH'],
            programme: ['NATIONAL_INSTITUTE_OF_MENTAL_HEALTH'],
        }),
        [{label: 'DOI', url: 'https://doi.org/10.55776/grw5'}],
    )
})

test('a numeric grant id alone never produces CORDIS for a non-EC funder', () => {
    assert.deepEqual(projectLinks({grantId: '9251368', funder: ['NSF'], programme: ['EHR/OAD']}), [])
})

test('website link is kept when it is http(s)', () => {
    assert.deepEqual(projectLinks({websiteUrl: 'http://www.lampre-project.eu/'}), [
        {label: 'Website', url: 'http://www.lampre-project.eu/'},
    ])
})

test('a non-http website value is dropped rather than rendered as a link', () => {
    assert.deepEqual(projectLinks({websiteUrl: 'javascript:alert(1)'}), [])
    assert.deepEqual(projectLinks({websiteUrl: 'not a url'}), [])
})

test('doi variants are normalised to one doi.org link', () => {
    for (const doi of ['10.3030/689660', 'doi:10.3030/689660', 'https://doi.org/10.3030/689660', ' 10.3030/689660 ']) {
        assert.deepEqual(projectLinks({doi}), [{label: 'DOI', url: 'https://doi.org/10.3030/689660'}], doi)
    }
})

test('a doi column that does not hold a doi produces no link', () => {
    assert.deepEqual(projectLinks({doi: 'n/a'}), [])
})

test('missing openaireId and websiteUrl simply add nothing', () => {
    assert.deepEqual(projectLinks({}), [])
    assert.deepEqual(projectLinks({doi: null, grantId: null, funder: null, programme: null, openaireId: null, websiteUrl: null}), [])
})
