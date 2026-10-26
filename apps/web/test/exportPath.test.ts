import assert from 'node:assert/strict'
import {test} from 'node:test'
import {buildExportPath} from '../src/modules/search/entity/exportPath.ts'

test('buildExportPath forwards filters, drops page/sort and web-only params', () => {
    const params = new URLSearchParams('q=heritage&page=3&sort=startDate_desc&sel=42&tab=overview&funder=EC&funder=NIH&e=projects')
    const path = buildExportPath('projects', params, {format: 'csv'})
    const [route, query] = path.split('?')
    assert.equal(route, '/v1/projects/export')
    const sent = new URLSearchParams(query)
    assert.deepEqual(sent.getAll('funder'), ['EC', 'NIH'])
    assert.equal(sent.get('q'), 'heritage')
    assert.equal(sent.get('format'), 'csv')
    for (const name of ['page', 'sort', 'sel', 'tab', 'e', 'excludeTranslated', 'includeTopic']) assert.equal(sent.has(name), false, name)
})

test('buildExportPath sends project toggles only when on', () => {
    const path = buildExportPath('projects', new URLSearchParams(), {format: 'json', excludeTranslated: true, includeTopic: false})
    const sent = new URLSearchParams(path.split('?')[1])
    assert.equal(sent.get('format'), 'json')
    assert.equal(sent.get('excludeTranslated'), 'true')
    assert.equal(sent.has('includeTopic'), false)
})

test('buildExportPath never sends project toggles for works', () => {
    const path = buildExportPath('works', new URLSearchParams('q=x'), {format: 'csv', excludeTranslated: true, includeTopic: true})
    assert.equal(path, '/v1/works/export?q=x&format=csv')
})
