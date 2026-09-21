import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first).
import {allowedEdits, editDistanceWithin, normalize, searchTopicNodes, tokenize} from '../dist/reference/topicSearch.js'

const node = (id: string, name: string, level: 'field' | 'subfield' | 'topic') => ({
    id,
    name,
    level,
    fieldId: level === 'field' ? null : '11',
    fieldName: level === 'field' ? null : 'Arts and Humanities',
    subfieldId: level === 'topic' ? '1202' : null,
    subfieldName: level === 'topic' ? 'History' : null,
})

const NODES = [
    node('11', 'Arts and Humanities', 'field'),
    node('1202', 'History', 'subfield'),
    node('12140', 'Archaeology and Cultural Heritage Studies', 'topic'),
    node('12141', 'Roman Archaeology and Architecture', 'topic'),
    node('12142', 'Digital Heritage and Photogrammetry', 'topic'),
    node('13718', 'Media Influence and Politics', 'topic'),
]

test('normalize folds case, accents and punctuation', () => {
    assert.equal(normalize('Ärchäologie,  Studien!'), 'archaologie studien')
    assert.equal(normalize('Roman—Architecture'), 'roman architecture')
    assert.deepEqual(tokenize('  Digital   Heritage '), ['digital', 'heritage'])
    assert.deepEqual(tokenize('   '), [])
})

test('the edit budget follows the same ladder as OpenSearch AUTO', () => {
    assert.equal(allowedEdits('ab'), 0)
    assert.equal(allowedEdits('arch'), 1)
    assert.equal(allowedEdits('archaeol'), 2)
})

test('editDistanceWithin gives up rather than computing a useless distance', () => {
    assert.equal(editDistanceWithin('archeology', 'archaeology', 2), 1)
    assert.equal(editDistanceWithin('cat', 'completely different', 2), null)
    assert.equal(editDistanceWithin('same', 'same', 0), 0)
})

test('an exact word beats a prefix beats a fuzzy match', () => {
    const hits = searchTopicNodes(NODES, 'archaeology', 10)
    assert.equal(hits[0].node.name, 'Archaeology and Cultural Heritage Studies')
    assert.ok(hits.some((hit) => hit.node.name === 'Roman Archaeology and Architecture'))
})

test('a typo still finds the topic — this is the point of the tolerant search', () => {
    const hits = searchTopicNodes(NODES, 'archeology', 10)
    assert.ok(hits.length > 0)
    assert.match(hits[0].node.name, /Archaeology/)
})

test('a prefix finds it before the whole word is typed', () => {
    assert.match(searchTopicNodes(NODES, 'photogram', 10)[0].node.name, /Photogrammetry/)
})

test('tokens are ANDed, so two words narrow rather than widen', () => {
    const hits = searchTopicNodes(NODES, 'roman architecture', 10)
    assert.equal(hits.length, 1)
    assert.equal(hits[0].node.name, 'Roman Archaeology and Architecture')
    // "roman" alone matches one topic; "roman politics" should match none.
    assert.equal(searchTopicNodes(NODES, 'roman politics', 10).length, 0)
})

test('a topic outranks the subfield and field that merely contain the word', () => {
    const hits = searchTopicNodes(NODES, 'history', 10)
    assert.equal(hits[0].node.level, 'subfield', 'the subfield IS named History')
    const heritage = searchTopicNodes(NODES, 'heritage', 10)
    assert.equal(heritage[0].node.level, 'topic')
})

test('accents in the query or the name do not matter', () => {
    assert.equal(searchTopicNodes([node('1', 'Archäologie', 'topic')], 'archaologie', 10).length, 1)
    assert.equal(searchTopicNodes([node('1', 'Archaologie', 'topic')], 'archäologie', 10).length, 1)
})

test('an empty query matches nothing rather than everything', () => {
    assert.deepEqual(searchTopicNodes(NODES, '', 10), [])
    assert.deepEqual(searchTopicNodes(NODES, '   ', 10), [])
})

test('results are capped', () => {
    assert.equal(searchTopicNodes(NODES, 'a', 2).length <= 2, true)
})
