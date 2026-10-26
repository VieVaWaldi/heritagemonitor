import assert from 'node:assert/strict'
import {test} from 'node:test'
import {
    isSelectionNoticeVisible,
    resolveSelection,
    SELECTION_NOTICE_MS,
    selectionUrlCorrection,
} from '../src/modules/search/entity/selectionFallback.ts'
import {applyPatch, patchClearsSelection, SEARCH_PARAM} from '../src/common/url/codecs.ts'

test('a kept selection stays, whether the check said matches or has not answered yet', () => {
    assert.deepEqual(resolveSelection('7', '1', 'matches'), {selectedId: '7', dropped: false})
    assert.deepEqual(resolveSelection('7', '1', 'unknown'), {selectedId: '7', dropped: false})
})

test('a dropped selection falls back to the first row and asks for a URL correction', () => {
    const resolved = resolveSelection('7', '1', 'dropped')
    assert.deepEqual(resolved, {selectedId: '1', dropped: true})
    assert.deepEqual(selectionUrlCorrection(resolved.dropped), {sel: null, history: 'replace'})
})

test('a dropped selection over an empty list selects nothing', () => {
    assert.deepEqual(resolveSelection('7', null, 'dropped'), {selectedId: null, dropped: true})
})

test('no selection in the URL is never "dropped"; nothing to correct', () => {
    const resolved = resolveSelection(null, '1', 'dropped')
    assert.equal(resolved.dropped, false)
    assert.equal(selectionUrlCorrection(resolved.dropped), null)
})

test('the corrected URL no longer carries the old sel and the other params survive', () => {
    const before = new URLSearchParams('q=castle&sel=7&region=Nordic')
    const after = applyPatch(before, {[SEARCH_PARAM.selection]: null})
    assert.equal(after.has(SEARCH_PARAM.selection), false)
    assert.equal(after.get('q'), 'castle')
    assert.equal(after.get('region'), 'Nordic')
})

test('sel survives facet changes and is cleared only by page, q and corpus', () => {
    assert.equal(patchClearsSelection({region: 'Nordic'}), false)
    assert.equal(patchClearsSelection({[SEARCH_PARAM.page]: '2'}), true)
    assert.equal(patchClearsSelection({[SEARCH_PARAM.query]: 'x'}), true)
    assert.equal(patchClearsSelection({[SEARCH_PARAM.corpus]: 'c'}), true)
    // a deep link's own sel wins
    assert.equal(patchClearsSelection({[SEARCH_PARAM.query]: 'x', [SEARCH_PARAM.selection]: '9'}), false)
})

test('the notice shows for five seconds after it was raised', () => {
    assert.equal(isSelectionNoticeVisible(0, 1_000), false)
    assert.equal(isSelectionNoticeVisible(1_000, 1_000), true)
    assert.equal(isSelectionNoticeVisible(1_000, 1_000 + SELECTION_NOTICE_MS - 1), true)
    assert.equal(isSelectionNoticeVisible(1_000, 1_000 + SELECTION_NOTICE_MS), false)
    assert.equal(SELECTION_NOTICE_MS, 5_000)
})
