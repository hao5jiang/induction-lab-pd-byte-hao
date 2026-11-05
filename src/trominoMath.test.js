import test from 'node:test'
import assert from 'node:assert/strict'
import { solveTromino } from './trominoMath.js'

test('tromino solver solves k=1 (2x2 board) with 1 missing cell', () => {
  const { size, grid, totalTiles } = solveTromino(1, 0, 0)
  assert.equal(size, 2)
  assert.equal(totalTiles, 1)
  assert.equal(grid[0][0], 0)
  assert.equal(grid[0][1], 1)
  assert.equal(grid[1][0], 1)
  assert.equal(grid[1][1], 1)
})

test('tromino solver solves k=2 (4x4 board) with missing cell at (2, 1)', () => {
  const { size, grid, totalTiles } = solveTromino(2, 2, 1)
  assert.equal(size, 4)
  assert.equal(totalTiles, 5) // (16 - 1) / 3 = 5
  assert.equal(grid[2][1], 0)

  // Verify all cells except (2,1) are covered by a tile >= 1
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (r === 2 && c === 1) {
        assert.equal(grid[r][c], 0)
      } else {
        assert.ok(grid[r][c] >= 1 && grid[r][c] <= 5)
      }
    }
  }

  // Count each tile id frequency to verify each is exactly 3 cells
  const counts = {}
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const id = grid[r][c]
      if (id > 0) counts[id] = (counts[id] || 0) + 1
    }
  }
  for (let id = 1; id <= 5; id++) {
    assert.equal(counts[id], 3)
  }
})
