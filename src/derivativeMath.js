export function valueAt(kind, x, c = 2) {
  return kind === 'constant' ? c : kind === 'square' ? x * x : c * Math.exp(x)
}
export function slopeAt(kind, x, c = 2) {
  return kind === 'constant' ? 0 : kind === 'square' ? 2 * x : c * Math.exp(x)
}
export function secantSlope(kind, x, h, c = 2) {
  return h === 0 ? null : (valueAt(kind, x + h, c) - valueAt(kind, x, c)) / h
}
export function componentFunction(x) {
  return x === 0 ? null : (x < 0 ? 1 : 2) * Math.exp(x)
}
