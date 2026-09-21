import assert from 'node:assert/strict'
import {test} from 'node:test'
import {
    HEX_COVERAGE,
    HEX_RESOLUTION_BY_ZOOM,
    hexResolutionForZoom,
    MAX_ELEVATION_METERS,
} from '../src/common/deckgl/layers/hexScale.ts'
import {hexBinsFromOrganisations, HEX_RESOLUTION} from '../src/common/deckgl/layers/hexBins.ts'

test('the resolution never decreases as you zoom in, and gets finer overall', () => {
    let previous = 0
    for (let zoom = 0; zoom <= 22; zoom += 0.1) {
        const resolution = hexResolutionForZoom(zoom)
        assert.ok(resolution >= previous, `zoom ${zoom}`)
        previous = resolution
    }
    assert.ok(hexResolutionForZoom(12) > hexResolutionForZoom(2))
})

test('the default continental zoom keeps the original resolution', () => {
    assert.equal(hexResolutionForZoom(4), HEX_RESOLUTION)
    assert.equal(hexResolutionForZoom(4.2), HEX_RESOLUTION)
})

test('the zoom table is ascending and starts at zoom 0', () => {
    assert.equal(HEX_RESOLUTION_BY_ZOOM[0].minZoom, 0)
    for (let i = 1; i < HEX_RESOLUTION_BY_ZOOM.length; i++) {
        assert.ok(HEX_RESOLUTION_BY_ZOOM[i].minZoom > HEX_RESOLUTION_BY_ZOOM[i - 1].minZoom)
        assert.ok(HEX_RESOLUTION_BY_ZOOM[i].resolution > HEX_RESOLUTION_BY_ZOOM[i - 1].resolution)
    }
})

test('the elevation ceiling is doubled (380 km) and coverage is a fraction', () => {
    assert.equal(MAX_ELEVATION_METERS, 380_000)
    assert.ok(HEX_COVERAGE > 0.45 && HEX_COVERAGE < 1)
})

test('a finer resolution splits bins; funding is conserved either way', () => {
    const orgs = [
        {id: '1', name: 'A', geolocation: [2.35, 48.85], funding: 100, projects: [], country: 'FR'},
        {id: '2', name: 'B', geolocation: [2.6, 48.95], funding: 50, projects: [], country: 'FR'},
    ] as never
    const coarse = hexBinsFromOrganisations(orgs, 2)
    const fine = hexBinsFromOrganisations(orgs, 8)
    assert.equal(coarse.length, 1)
    assert.equal(fine.length, 2)
    const total = (bins: typeof coarse) => bins.reduce((sum, bin) => sum + bin.funding, 0)
    assert.equal(total(coarse), 150)
    assert.equal(total(fine), 150)
})
