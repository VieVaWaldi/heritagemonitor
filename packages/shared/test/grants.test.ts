import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first).
import {GRANT_FACET_FIELDS, grantHierarchy, grantRowSchema, grantTitle} from '../dist/grants.js'

// A real three-level stream, exactly as the index returns it.
const ERASMUS = {
    id: 'EC::ERASMUS+::Cooperation for innovation and the exchange of good practices::School Exchange Partnerships',
    funder: 'EC',
    funder_name: 'European Commission',
    programme: 'ERASMUS+',
    action: 'Cooperation for innovation and the exchange of good practices',
    description: 'ERASMUS+ - Cooperation for innovation and the exchange of good practices - School Exchange Partnerships',
    jurisdiction: 'EU',
    is_pseudo: false,
    project_count: 5789,
    dch_project_count: 1402,
    total_funded_eur: 608302984.76,
}

// A pseudo stream. The index omits programme, action, description and the
// amount entirely rather than sending nulls — the whole reason the schema uses
// `.nullish()` and not `.nullable()`.
const PSEUDO = {
    id: 'NONE::NWO',
    funder: 'NWO',
    funder_name: 'Netherlands Organisation for Scientific Research (NWO)',
    jurisdiction: 'NL',
    is_pseudo: true,
    project_count: 40597,
    dch_project_count: 585,
}

test('a full stream document parses with every field', () => {
    const row = grantRowSchema.parse(ERASMUS)
    assert.equal(row.action, ERASMUS.action)
    assert.equal(row.total_funded_eur, 608302984.76)
    assert.equal(row.is_pseudo, false)
})

test('REGRESSION: a pseudo stream parses although four fields are absent, not null', () => {
    const row = grantRowSchema.parse(PSEUDO)
    assert.equal(row.programme, null)
    assert.equal(row.action, null)
    assert.equal(row.description, null)
    assert.equal(row.total_funded_eur, null)
    assert.equal(row.is_pseudo, true)
})

test('a stream with nothing but an id still parses', () => {
    // Defensive: every field but the id is optional on the index.
    const row = grantRowSchema.parse({id: 'X::Y'})
    assert.equal(row.funder, null)
    assert.equal(row.is_pseudo, false)
    assert.equal(row.dch_project_count, null)
})

test('a document with no id at all is rejected', () => {
    assert.equal(grantRowSchema.safeParse({funder: 'EC'}).success, false)
})

test('the title of a real stream is its description', () => {
    assert.equal(grantTitle(grantRowSchema.parse(ERASMUS)), ERASMUS.description)
})

test('a pseudo stream is never titled with its bare id', () => {
    const title = grantTitle(grantRowSchema.parse(PSEUDO))
    assert.equal(title, 'Projects without a funding stream — Netherlands Organisation for Scientific Research (NWO)')
    assert.ok(!title.includes('NONE::'))
})

test('the title falls back through description, funder name, then id', () => {
    assert.equal(grantTitle(grantRowSchema.parse({id: 'A::B', funder_name: 'Some Council'})), 'Some Council')
    assert.equal(grantTitle(grantRowSchema.parse({id: 'A::B'})), 'A::B')
})

test('the hierarchy is funder, programme, action — outermost first', () => {
    assert.deepEqual(grantHierarchy(grantRowSchema.parse(ERASMUS)), [
        {level: 'Funder', value: 'European Commission'},
        {level: 'Programme', value: 'ERASMUS+'},
        {level: 'Action', value: 'Cooperation for innovation and the exchange of good practices'},
    ])
})

test('a pseudo stream has only a funder — it is not a programme', () => {
    assert.deepEqual(grantHierarchy(grantRowSchema.parse(PSEUDO)), [
        {level: 'Funder', value: 'Netherlands Organisation for Scientific Research (NWO)'},
    ])
})

test('a two-level stream stops at the programme', () => {
    const row = grantRowSchema.parse({id: 'UKRI::AHRC', funder: 'UKRI', funder_name: 'UK Research and Innovation', programme: 'AHRC'})
    assert.deepEqual(grantHierarchy(row), [
        {level: 'Funder', value: 'UK Research and Innovation'},
        {level: 'Programme', value: 'AHRC'},
    ])
})

test('every facet has a distinct param and the funder one is searchable', () => {
    // The funder facet aggregates codes and shows names, so it MUST be
    // searchable — a plain checkbox list of 100 codes is unusable.
    const params = GRANT_FACET_FIELDS.map((facet) => facet.param)
    assert.equal(new Set(params).size, params.length)
    assert.equal(GRANT_FACET_FIELDS.find((facet) => facet.param === 'funder')?.searchable, true)
})
