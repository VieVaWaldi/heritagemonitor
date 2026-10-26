import assert from 'node:assert/strict'
import {createElement} from 'react'
import {test} from 'node:test'
import {NOTICE_AUTO_DISMISS_MS, noticeKey, noticeTextOf} from '../src/common/components/noticeKey.ts'

test('notices dismiss after five seconds', () => {
    assert.equal(NOTICE_AUTO_DISMISS_MS, 5_000)
})

test('text is read through nested elements, numbers and arrays', () => {
    const node = ['Few results for ', createElement('strong', null, 'castle'), ', ', 3, ' shown', null, false]
    assert.equal(noticeTextOf(node), 'Few results for castle, 3 shown')
})

test('the same content is the same notice, changed content is a new one', () => {
    assert.equal(noticeKey('note', 'Filtered by: Funder.'), noticeKey('note', 'Filtered by: Funder.'))
    assert.notEqual(noticeKey('note', 'Filtered by: Funder.'), noticeKey('note', 'Filtered by: Funder, Region.'))
    assert.notEqual(noticeKey('note', 'x'), noticeKey('warning', 'x'))
})
