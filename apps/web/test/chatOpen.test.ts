import assert from 'node:assert/strict'
import {test} from 'node:test'
import {isLandingPath, resolveChatOpen} from '../src/common/llmchat/chatOpen.ts'

test('open by default on the landing page on desktop', () => {
    assert.equal(resolveChatOpen({userChoice: null, isLanding: true, isMobile: false}), true)
})

test('closed by default on phones and on other pages', () => {
    assert.equal(resolveChatOpen({userChoice: null, isLanding: true, isMobile: true}), false)
    assert.equal(resolveChatOpen({userChoice: null, isLanding: false, isMobile: false}), false)
})

test('a panel the user closed stays closed, whatever the default says', () => {
    assert.equal(resolveChatOpen({userChoice: false, isLanding: true, isMobile: false}), false)
})

test('a panel the user opened stays open elsewhere', () => {
    assert.equal(resolveChatOpen({userChoice: true, isLanding: false, isMobile: false}), true)
})

test('only "/" is the landing page', () => {
    assert.equal(isLandingPath('/'), true)
    assert.equal(isLandingPath('/search'), false)
    assert.equal(isLandingPath(null), false)
})
