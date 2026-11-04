import test from 'node:test'
import assert from 'node:assert/strict'
import {EARTH_RADIUS_KM as R, makeCamera, project, groundPoint, groundDistance,
  surfaceDistance, logDistance, rangeState} from '../lib/geo.mjs'

const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a-b) < tolerance, `${a} != ${b}`)

test('surface distance handles zero, quarter circumference, poles and dateline', () => {
  close(surfaceDistance([0, 0], [0, 0]), 0)
  close(surfaceDistance([0, 0], [0, 90]), Math.PI*R/2)
  close(surfaceDistance([90, 0], [90, 120]), 0)
  close(surfaceDistance([0, 179], [0, -179]), Math.PI*R/90)
  close(surfaceDistance([0, 0], [0, 180]), Math.PI*R)
})

test('projection and ground rays share a camera at close, inclined and orbital scales', () => {
  for (const distance of [0.1, 20, 3000]) {
    for (const tilt of [0, 45, 80]) {
      const cam = makeCamera({lat: 12, lon: -40, distance, tilt, heading: 33, offsetX: -120})
      const pixel = project(cam, 12, -40)
      close(pixel.x, 840, 1e-5); close(pixel.y, 540, 1e-5)
      const hit = groundPoint(cam, pixel.x, pixel.y)
      close(hit.lat, 12, 1e-6); close(hit.lon, -40, 1e-6)
    }
  }
})

test('altitude is radial height rather than inclined target distance', () => {
  const cam = makeCamera({lat: 0, lon: 0, distance: 100, tilt: 60})
  close(cam.altitude, Math.sqrt(R*R+100*100+2*R*100*0.5)-R)
  assert.ok(cam.altitude < 100)
})

test('hidden ground has no projected label and sky has no invented scale', () => {
  const cam = makeCamera({lat: 0, lon: 0, distance: 3000})
  assert.equal(project(cam, 0, 180), null)
  assert.equal(groundPoint(cam, 100000, 540), null)
  assert.equal(groundDistance(cam, [960, 540], [100000, 540]), null)
  const d = groundDistance(cam, [900, 540], [1020, 540])
  assert.ok(d > 0 && d < 200)
})

test('log interpolation has geometric midpoint and clamps only progress', () => {
  close(logDistance(100, 1, 0.5), 10)
  close(logDistance(100, 1, -1), 100)
  close(logDistance(100, 1, 2), 1)
  assert.throws(() => logDistance(0, 1, 0.5), RangeError)
  assert.throws(() => logDistance(1, 2, NaN), TypeError)
})

test('range tip and counter agree through a dateline crossing without a reset', () => {
  const from = [0, 170], to = [0, -170]
  let previous = -1
  for (let i = 0; i <= 20; i++) {
    const state = rangeState(from, to, i/20)
    assert.ok(state.distanceKm >= previous)
    close(surfaceDistance(from, [state.tip.lat, state.tip.lon]), state.distanceKm, 1e-7)
    previous = state.distanceKm
  }
  close(Math.abs(rangeState(from, to, 0.5).tip.lon), 180)
  assert.throws(() => rangeState([0, 0], [0, 180], 0.5), RangeError)
})

test('invalid geographic and camera inputs fail instead of producing NaN geometry', () => {
  assert.throws(() => surfaceDistance([91, 0], [0, 0]), RangeError)
  assert.throws(() => surfaceDistance([0, 181], [0, 0]), RangeError)
  assert.throws(() => surfaceDistance([0, 0], [0, 1], 0), RangeError)
  assert.throws(() => makeCamera({lat: 0, lon: 0, distance: -1}), RangeError)
  assert.throws(() => makeCamera({lat: 0, lon: 0, distance: 1, tilt: 90}), RangeError)
  assert.throws(() => makeCamera({lat: 0, lon: 0, distance: 1, fov: Infinity}), TypeError)
})
