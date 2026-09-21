import assert from 'node:assert/strict'
import {test} from 'node:test'
import {
    BASE_ELEVATION_SCALE,
    ELEVATION_RANGE_MAX,
    HEX_COLOR_RANGE,
    HEX_COVERAGE,
    hexColorStep,
    hexElevationScale,
    hexRadiusMeters,
    hexResolutionForZoom,
    snapHexZoom,
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

test('the default continental zoom uses the original 10 km radius, i.e. resolution 5', () => {
    assert.ok(Math.abs(hexRadiusMeters(4.2) - 10_000) < 1)
    assert.equal(hexResolutionForZoom(4.2), 5)
    assert.equal(hexResolutionForZoom(4), HEX_RESOLUTION)
})

test('zooming in reaches city-sized cells, zooming out stays coarse', () => {
    assert.ok(hexResolutionForZoom(12) >= 9)
    assert.ok(hexResolutionForZoom(2) <= 4)
})

test('the copied original parameters', () => {
    assert.equal(ELEVATION_RANGE_MAX, 3000)
    assert.equal(BASE_ELEVATION_SCALE, 400)
    assert.equal(HEX_COVERAGE, 0.8)
    assert.equal(HEX_COLOR_RANGE.length, 6)
    assert.equal(hexElevationScale(4.2, false), 400)
    assert.equal(hexElevationScale(4.2, true), 4000)
})

test('colour steps are equal-width and the tallest hex takes the last step', () => {
    assert.equal(hexColorStep(0), 0)
    assert.equal(hexColorStep(0.5), 3)
    assert.equal(hexColorStep(1), 5)
})

test('the zoom snaps to half levels', () => {
    assert.equal(snapHexZoom(4.2), 4)
    assert.equal(snapHexZoom(4.3), 4.5)
    assert.equal(snapHexZoom(4.74), 4.5)
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
