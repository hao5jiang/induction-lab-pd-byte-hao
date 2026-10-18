import test from 'node:test'
import assert from 'node:assert/strict'
import { valueAt, slopeAt, secantSlope, componentFunction } from './derivativeMath.js'

test('constant height stays two while tangent and secant slopes are zero', () => {
  for (const x of [-2, 0, 1, 2]) {
    assert.equal(valueAt('constant', x), 2)
    assert.equal(slopeAt('constant', x), 0)
    for (const h of [-1, .02, 1.5]) assert.equal(Math.abs(secantSlope('constant', x, h)), 0)
  }
  assert.equal(secantSlope('constant', 1, 0), null)
})
test('quadratic tangent slope and exponential family including zero', () => {
  assert.equal(slopeAt('square', 2), 4)
  for (const a of [-2, 0, 1, 2]) for (const h of [-1.5, -.02, .02, 1.5]) {
    assert.ok(Math.abs(secantSlope('square', a, h) - (2*a+h)) < 1e-10)
  }
  assert.equal(secantSlope('square', 1, 0), null)
  assert.notEqual(valueAt('square', 1), slopeAt('square', 1))
  for (const c of [-2, 0, .5, 2]) for (const x of [-1, 0, 1]) {
    assert.equal(valueAt('exp', x, c), slopeAt('exp', x, c))
  }
})
test('disconnected example still satisfies the given value at zero', () => {
  assert.equal(componentFunction(1), null)
  assert.equal(componentFunction(0), 1)
  assert.equal(componentFunction(-1) / Math.exp(-1), 1)
  assert.equal(componentFunction(2) / Math.exp(2), 2)
})
