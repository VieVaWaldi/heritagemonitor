import assert from 'node:assert/strict'
import {test} from 'node:test'
import {
    availableTabs,
    grantHiddenTabs,
    minorityHiddenTabs,
    organisationHiddenTabs,
    organisationNetworkHiddenTabs,
    projectHiddenTabs,
    queryNetworkHiddenTabs,
    resolveTab,
    visibleTabs,
    workHiddenTabs,
} from '../src/modules/search/entity/tabAvailability.ts'
import {applyPatch, patchClearsDetailPage, SEARCH_PARAM} from '../src/common/url/codecs.ts'

test('a known zero hides the tab; a missing figure and a still-loading document hide nothing', () => {
    assert.deepEqual(projectHiddenTabs({org_count: 0, work_count: 0}), ['organisations', 'works'])
    assert.deepEqual(projectHiddenTabs({org_count: 3, work_count: 0}), ['works'])
    assert.deepEqual(projectHiddenTabs({org_count: null, work_count: undefined}), [])
    assert.deepEqual(projectHiddenTabs(null), [])
})

test('organisations (and experts, whose detail is an organisation): projects by project_count, works by work_count', () => {
    assert.deepEqual(organisationHiddenTabs({project_count: 0, work_count: 12}), ['projects'])
    assert.deepEqual(organisationHiddenTabs({project_count: 4, work_count: 0}), ['works'])
    assert.deepEqual(organisationHiddenTabs({project_count: 4, work_count: null}), [])
    assert.deepEqual(organisationHiddenTabs(null), [])
})

test('works: projects by an empty project_ids, organisations by org_count (the true number) else an empty id list', () => {
    assert.deepEqual(workHiddenTabs({project_ids: [], org_count: 5, organisation_ids: ['a']}), ['projects'])
    assert.deepEqual(workHiddenTabs({project_ids: ['p'], org_count: 0, organisation_ids: []}), ['organisations'])
    // the id list is capped at 100: a non-zero count wins over an empty list
    assert.deepEqual(workHiddenTabs({project_ids: ['p'], org_count: 150, organisation_ids: []}), [])
    assert.deepEqual(workHiddenTabs({project_ids: ['p'], org_count: null, organisation_ids: []}), ['organisations'])
    assert.deepEqual(workHiddenTabs(null), [])
})

test('grants: a stream with no project has no projects tab and, derived from them, no organisations tab', () => {
    assert.deepEqual(grantHiddenTabs({project_count: 0}), ['projects', 'organisations'])
    assert.deepEqual(grantHiddenTabs({project_count: 12}), [])
    assert.deepEqual(grantHiddenTabs({project_count: null}), [])
})

test('minorities: subgroups, projects (+ funders), works, organisations, topics each by their own rollup', () => {
    const empty = {known_subgroups: [], project_count: 0, work_count: 0, org_count: 0, topic_ids: [], topic_counts: []}
    assert.deepEqual(minorityHiddenTabs(empty), ['subgroups', 'projects', 'funding', 'works', 'organisations', 'topics'])
    const full = {known_subgroups: [{}], project_count: 9, work_count: 4, org_count: 3, topic_ids: ['1'], topic_counts: [{}]}
    assert.deepEqual(minorityHiddenTabs(full), [])
    assert.deepEqual(minorityHiddenTabs({...full, work_count: 0}), ['works'])
    // topic_counts alone keeps the tab
    assert.deepEqual(minorityHiddenTabs({...full, topic_ids: []}), [])
    // unknown figures keep their tabs
    assert.deepEqual(minorityHiddenTabs({known_subgroups: [{}], project_count: null, work_count: null, org_count: null, topic_ids: ['1']}), [])
    assert.deepEqual(minorityHiddenTabs(null), [])
})

test('organisation network: the centre\'s Projects tab by the centre\'s own project_count', () => {
    assert.deepEqual(organisationNetworkHiddenTabs({project_count: 0}), ['projects'])
    assert.deepEqual(organisationNetworkHiddenTabs({project_count: 30}), [])
    assert.deepEqual(organisationNetworkHiddenTabs(null), [])
})

test('query network clusters: Projects by the cluster\'s assigned projects, Bridges by the network having any hinge', () => {
    assert.deepEqual(queryNetworkHiddenTabs({clusterProjects: 0, hinges: 2, hingeProjects: 0}), ['projects'])
    assert.deepEqual(queryNetworkHiddenTabs({clusterProjects: 5, hinges: 0, hingeProjects: 0}), ['bridges'])
    assert.deepEqual(queryNetworkHiddenTabs({clusterProjects: 5, hinges: 0, hingeProjects: 3}), [])
    assert.deepEqual(queryNetworkHiddenTabs({clusterProjects: 0, hinges: 0, hingeProjects: 0}), ['projects', 'bridges'])
    // no cluster selected yet (nothing found / still loading): nothing hides
    assert.deepEqual(queryNetworkHiddenTabs({clusterProjects: null, hinges: 1, hingeProjects: 1}), [])
    assert.deepEqual(queryNetworkHiddenTabs(null), [])
})

test('the overview (first tab) is never hidden, and order is kept', () => {
    const all = ['overview', 'projects', 'works'] as const
    assert.deepEqual(availableTabs(all, ['overview', 'works']), ['overview', 'projects'])
    assert.deepEqual(availableTabs(all, []), ['overview', 'projects', 'works'])
    assert.deepEqual(visibleTabs([{value: 'overview'}, {value: 'projects'}, {value: 'works'}], ['overview', 'works']).map((tab) => tab.value), ['overview', 'works'])
})

test('a URL naming a hidden tab falls back to the first available and asks for a rewrite', () => {
    const available = ['overview', 'projects']
    assert.deepEqual(resolveTab('works', available), {tab: 'overview', rewrite: true})
    assert.deepEqual(resolveTab('projects', available), {tab: 'projects', rewrite: false})
})

test('the rewrite is one patch: the tab is set and the detail panel page is cleared', () => {
    const patch = {[SEARCH_PARAM.tab]: 'overview'}
    assert.equal(patchClearsDetailPage(patch), true)
    const before = new URLSearchParams('e=works&sel=W1&tab=organisations&dpage=3')
    const after = applyPatch(before, {...patch, [SEARCH_PARAM.detailPage]: null})
    assert.equal(after.get('tab'), 'overview')
    assert.equal(after.has('dpage'), false)
    assert.equal(after.get('sel'), 'W1')
})
