/**
 * L-Tromino Tiling (Deficient Board) solver using divide and conquer (constructive induction).
 * Given board of size 2^k x 2^k with one missing/defective square at (missR, missC),
 * tile it with L-trominoes numbered 1, 2, 3...
 */

export function solveTromino(k, missR, missC) {
  const size = 1 << k
  // grid[r][c] = 0 (empty/missing), or tileId >= 1
  const grid = Array.from({ length: size }, () => Array(size).fill(0))
  let currentTile = 0
  const steps = []

  function tileSubboard(tr, tc, dr, dc, s) {
    if (s === 1) return
    const half = s >> 1
    currentTile += 1
    const tId = currentTile

    // Check four quadrants:
    // Top-Left (TL): rows [tr, tr+half-1], cols [tc, tc+half-1]
    // Top-Right (TR): rows [tr, tr+half-1], cols [tc+half, tc+s-1]
    // Bottom-Left (BL): rows [tr+half, tr+s-1], cols [tc, tc+half-1]
    // Bottom-Right (BR): rows [tr+half, tr+s-1], cols [tc+half, tc+s-1]

    const inTL = dr < tr + half && dc < tc + half
    const inTR = dr < tr + half && dc >= tc + half
    const inBL = dr >= tr + half && dc < tc + half
    const inBR = dr >= tr + half && dc >= tc + half

    // The center Tromino will fill the corners of the 3 quadrants that do NOT have the missing tile.
    const centerTrominoCoords = []

    // 1. TL
    let nextTLR = dr, nextTLC = dc
    if (!inTL) {
      nextTLR = tr + half - 1
      nextTLC = tc + half - 1
      grid[nextTLR][nextTLC] = tId
      centerTrominoCoords.push([nextTLR, nextTLC])
    }

    // 2. TR
    let nextTRR = dr, nextTRC = dc
    if (!inTR) {
      nextTRR = tr + half - 1
      nextTRC = tc + half
      grid[nextTRR][nextTRC] = tId
      centerTrominoCoords.push([nextTRR, nextTRC])
    }

    // 3. BL
    let nextBLR = dr, nextBLC = dc
    if (!inBL) {
      nextBLR = tr + half
      nextBLC = tc + half - 1
      grid[nextBLR][nextBLC] = tId
      centerTrominoCoords.push([nextBLR, nextBLC])
    }

    // 4. BR
    let nextBRR = dr, nextBRC = dc
    if (!inBR) {
      nextBRR = tr + half
      nextBRC = tc + half
      grid[nextBRR][nextBRC] = tId
      centerTrominoCoords.push([nextBRR, nextBRC])
    }

    steps.push({
      tileId: tId,
      quadrant: inTL ? 'TL' : inTR ? 'TR' : inBL ? 'BL' : 'BR',
      size: s,
      center: [tr + half, tc + half],
      cells: centerTrominoCoords
    })

    // Recurse into 4 subboards
    tileSubboard(tr, tc, nextTLR, nextTLC, half)
    tileSubboard(tr, tc + half, nextTRR, nextTRC, half)
    tileSubboard(tr + half, tc, nextBLR, nextBLC, half)
    tileSubboard(tr + half, tc + half, nextBRR, nextBRC, half)
  }

  tileSubboard(0, 0, missR, missC, size)

  return {
    size,
    grid,
    totalTiles: currentTile,
    steps
  }
}

// Predefined vibrant, distinguishable colors for L-trominoes
export const TILE_COLORS = [
  '#2a7b72', '#d97736', '#4a6fa5', '#c85a53',
  '#3f88c5', '#7a5195', '#ef8a17', '#3d9970',
  '#0074d9', '#e377c2', '#17becf', '#bcbd22',
  '#8c564b', '#9467bd', '#2ca02c', '#ff7f0e',
  '#1f77b4', '#d62728', '#209cee', '#f39c12',
  '#e74c3c', '#9b59b6', '#1abc9c', '#34495e',
]

export function getTileColor(tileId) {
  if (!tileId) return 'transparent'
  return TILE_COLORS[(tileId - 1) % TILE_COLORS.length]
}
