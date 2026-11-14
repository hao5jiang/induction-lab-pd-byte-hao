import { useState, useEffect } from 'react'
import { solveTromino, getTileColor } from './trominoMath.js'
import { MathFormula, MathText } from './MathText.jsx'
import './tromino.css'

export function TrominoBoard({ k = 2, missR = 0, missC = 0, currentStep = -1, onSelectMiss = null, manualTiles = null, selected = [], onSelectCell = null }) {
  const size = 1 << k
  const solution = solveTromino(k, missR, missC)
  const { grid, steps } = solution

  // Determine which cells should be shown given currentStep
  // If currentStep < 0: show nothing (only missing cell)
  // If currentStep >= steps.length: show all
  const activeTileMax = currentStep < 0 ? 0 : Math.min(currentStep + 1, steps.length)

  // Set of tile IDs that are currently placed
  const visibleTileIds = new Set(steps.slice(0, activeTileMax).map(s => s.tileId))
  const currentStepTileId = currentStep >= 0 && currentStep < steps.length ? steps[currentStep].tileId : null

  return (
    <div className="tromino-board-wrapper">
      <div
        className="tromino-board"
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gridTemplateRows: `repeat(${size}, 1fr)`
        }}
      >
        {Array.from({ length: size }).map((_, r) =>
          Array.from({ length: size }).map((_, c) => {
            const isMissing = r === missR && c === missC
            const manualIndex = manualTiles?.findIndex(tile => tile.some(([row, col]) => row === r && col === c)) ?? -1
            const tileId = manualTiles ? manualIndex + 1 : grid[r][c]
            const isTiled = !isMissing && tileId > 0 && (manualTiles ? true : visibleTileIds.has(tileId))
            const isCurrent = tileId === currentStepTileId

            return (
              <button
                type="button"
                key={`${r}-${c}`}
                className={`tromino-cell ${isMissing ? 'missing' : ''} ${isTiled ? 'tiled' : 'empty'} ${isCurrent || selected.some(([row, col]) => row === r && col === c) ? 'highlight-step' : ''}`}
                style={{
                  backgroundColor: isMissing ? undefined : (isTiled ? getTileColor(tileId) : undefined)
                }}
                title={isMissing ? `缺失方格 (${r+1}, ${c+1})` : (isTiled ? `L型骨牌 #${tileId}` : manualTiles ? `选择方格 (${r+1}, ${c+1})` : `点击设为缺失方格 (${r+1}, ${c+1})`)}
                aria-label={isMissing ? `缺失方格，第 ${r + 1} 行，第 ${c + 1} 列` : `第 ${r + 1} 行，第 ${c + 1} 列${isTiled ? '，已铺放' : ''}`}
                aria-pressed={manualTiles ? selected.some(([row, col]) => row === r && col === c) : undefined}
                onClick={() => {
                  if (onSelectCell) onSelectCell(r, c)
                  else if (onSelectMiss) onSelectMiss(r, c)
                }}
              >
                {isTiled ? tileId : ''}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export function TrominoPieceDemo() {
  // The 4 orientations of an L-tromino in a 2x2 bounding box:
  // Each array indicates whether [r, c] in [[0,0], [0,1], [1,0], [1,1]] is filled
  const orientations = [
    { name: '缺右上', cells: [true, false, true, true], color: '#2a7b72' },
    { name: '缺左上', cells: [false, true, true, true], color: '#d97736' },
    { name: '缺右下', cells: [true, true, true, false], color: '#3f88c5' },
    { name: '缺左下', cells: [true, true, false, true], color: '#7a5195' },
  ]

  return (
    <div className="tromino-intro-card">
      <div className="tromino-intro-text">
        <span className="mj-kicker" style={{ display: 'block', marginBottom: '4px' }}>WHAT IS AN L-TROMINO · 什么是 L 型骨牌</span>
        <h3>由 3 个正方形格子拼成的“L”形</h3>
        <p>
          每个 <strong>L 型骨牌</strong>由 3 个 <MathFormula tex={String.raw`1 \times 1`} /> 的正方形小方格拼合而成（即一个 <MathFormula tex={String.raw`2 \times 2`} /> 的四格中挖去任意 1 格）。
          在平面上它可以旋转成 4 种方向：
        </p>
      </div>
      <div className="tromino-orientations">
        {orientations.map((o, idx) => (
          <div key={idx} className="tromino-orientation-item" title={o.name}>
            <div className="tromino-mini-grid">
              {o.cells.map((filled, cIdx) => (
                <div
                  key={cIdx}
                  className={`tromino-mini-cell ${filled ? 'filled' : 'empty'}`}
                  style={{ backgroundColor: filled ? o.color : undefined }}
                />
              ))}
            </div>
            <span className="tromino-orientation-label">{o.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TrominoActivity() {
  const [k, setK] = useState(2) // 1: 2x2, 2: 4x4, 3: 8x8
  const [missR, setMissR] = useState(1)
  const [missC, setMissC] = useState(2)
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [manual, setManual] = useState(false)
  const [manualTiles, setManualTiles] = useState([])
  const [selected, setSelected] = useState([])
  const [manualMessage, setManualMessage] = useState('')

  const size = 1 << k
  const totalCells = size * size
  const totalTiles = (totalCells - 1) / 3
  const solution = solveTromino(k, missR, missC)

  // Clamp stepIndex when k or miss changes
  useEffect(() => {
    setStepIndex(0)
    setIsPlaying(false)
    setManualTiles([])
    setSelected([])
    setManualMessage('')
  }, [k, missR, missC])

  // Animation player
  useEffect(() => {
    if (!isPlaying) return
    if (stepIndex >= solution.steps.length) {
      setIsPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      setStepIndex(s => s + 1)
    }, 450)
    return () => clearTimeout(timer)
  }, [isPlaying, stepIndex, solution.steps.length])

  const resetInteractionState = () => {
    setStepIndex(0)
    setIsPlaying(false)
    setManualTiles([])
    setSelected([])
    setManualMessage('')
  }

  const handleSelectSize = (newK, newMissR, newMissC) => {
    setK(newK)
    setMissR(newMissR)
    setMissC(newMissC)
    resetInteractionState()
  }

  const handleSelectMiss = (r, c) => {
    setMissR(r)
    setMissC(c)
    resetInteractionState()
  }

  const handleManualCell = (r, c) => {
    if ((r === missR && c === missC) || manualTiles.some(tile => tile.some(([row, col]) => row === r && col === c))) return
    if (selected.some(([row, col]) => row === r && col === c)) {
      setSelected(selected.filter(([row, col]) => row !== r || col !== c))
      return
    }
    const next = [...selected, [r, c]]
    if (next.length < 3) { setSelected(next); setManualMessage(''); return }
    const rows = next.map(([row]) => row), cols = next.map(([, col]) => col)
    if (Math.max(...rows) - Math.min(...rows) !== 1 || Math.max(...cols) - Math.min(...cols) !== 1) {
      setSelected([]); setManualMessage('请选择相邻的三个格子，组成 L 形。'); return
    }
    setManualTiles([...manualTiles, next]); setSelected([])
    setManualMessage(manualTiles.length + 1 === totalTiles ? '完成！棋盘已铺满。' : '已放置一块 L 形骨牌。')
  }

  const currentStepInfo = stepIndex > 0 && stepIndex <= solution.steps.length ? solution.steps[stepIndex - 1] : null

  return (
    <>
      <header className="mj-lesson-title">
        <span>03 / 残缺棋盘与骨牌覆盖</span>
        <h1><MathText>残缺棋盘与 L 型骨牌覆盖</MathText></h1>
        <p>对于边长为 <MathFormula tex="2^n" /> 的正方形棋盘，缺失一个格子后，能否用由 3 个方格组成的 L 型骨牌完全铺满？</p>
      </header>

      <TrominoPieceDemo />

      <div className="mj-two-col">
        {/* 左栏：交互棋盘与动画操作 */}
        <section className="mj-panel">
          <span className="mj-kicker">INTERACTIVE TILING · 交互模拟</span>
          <h2>棋盘尺寸：<MathFormula tex={`${size}\\times${size}`} /></h2>

          <div className="tromino-controls">
            <div className="mj-slider" style={{ margin: 0 }} role="group" aria-label="选择棋盘规模">
              选择规模 <MathFormula tex="n" />：
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className={`mj-button ${k === 1 ? '' : 'secondary'}`}
                  style={{ minHeight: '36px', padding: '6px 12px' }}
                  onClick={() => handleSelectSize(1, 0, 0)}
                >
                  <MathFormula tex={String.raw`2\times2`} />
                </button>
                <button
                  type="button"
                  className={`mj-button ${k === 2 ? '' : 'secondary'}`}
                  style={{ minHeight: '36px', padding: '6px 12px' }}
                  onClick={() => handleSelectSize(2, 1, 2)}
                >
                  <MathFormula tex={String.raw`4\times4`} />
                </button>
                <button
                  type="button"
                  className={`mj-button ${k === 3 ? '' : 'secondary'}`}
                  style={{ minHeight: '36px', padding: '6px 12px' }}
                  onClick={() => handleSelectSize(3, 2, 3)}
                >
                  <MathFormula tex={String.raw`8\times8`} />
                </button>
              </div>
            </div>
          </div>

          <div className="tromino-container">
            <div className="tromino-controls"><button type="button" className={`mj-button ${manual ? '' : 'secondary'}`} onClick={() => { setManual(true); setIsPlaying(false) }}>自己铺放</button><button type="button" className={`mj-button ${manual ? 'secondary' : ''}`} onClick={() => { setManual(false); setSelected([]) }}>观看演示</button></div>
            <TrominoBoard
              k={k}
              missR={missR}
              missC={missC}
              currentStep={stepIndex - 1}
              onSelectMiss={manual ? null : handleSelectMiss}
              manualTiles={manual ? manualTiles : null}
              selected={manual ? selected : []}
              onSelectCell={manual ? handleManualCell : null}
            />

            <div className="tromino-info-badge">
              <span>总格数：<strong>{totalCells}</strong></span>
              <span>•</span>
              <span>缺失格：<strong>({missR + 1}, {missC + 1})</strong></span>
              <span>•</span>
              <span>需骨牌：<strong>{totalTiles}</strong> 块</span>
            </div>
            <p className="mj-legend">{manual ? '依次点击三个相邻格子，放置一块 L 形骨牌；再次点击已选格可取消选择。切回演示可更改缺失格。' : '点击棋盘上的方格，可将其设为新的缺失格。'}</p>
            {manual && <><p role="status">{manualMessage}</p><div className="tromino-controls"><button type="button" className="mj-button secondary" disabled={!manualTiles.length && !selected.length} onClick={() => { if (selected.length) setSelected([]); else setManualTiles(manualTiles.slice(0, -1)); setManualMessage('') }}>撤销</button><button type="button" className="mj-button secondary" onClick={() => { setManualTiles([]); setSelected([]); setManualMessage('') }}>清空铺放</button></div></>}
          </div>

          {!manual && <div className="tromino-controls" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="mj-button secondary"
              disabled={stepIndex <= 0}
              onClick={() => { setIsPlaying(false); setStepIndex(0); }}
            >
              重置
            </button>
            <button
              type="button"
              className="mj-button secondary"
              disabled={stepIndex <= 0}
              onClick={() => { setIsPlaying(false); setStepIndex(s => Math.max(0, s - 1)); }}
            >
              ← 上一块
            </button>
            <button
              type="button"
              className="mj-button"
              onClick={() => {
                if (stepIndex >= solution.steps.length) setStepIndex(0)
                setIsPlaying(!isPlaying)
              }}
            >
              {isPlaying ? '暂停' : (stepIndex >= solution.steps.length ? '重新演示' : '自动演示 ▶')}
            </button>
            <button
              type="button"
              className="mj-button secondary"
              disabled={stepIndex >= solution.steps.length}
              onClick={() => { setIsPlaying(false); setStepIndex(s => Math.min(solution.steps.length, s + 1)); }}
            >
              下一块 →
            </button>
            <button
              type="button"
              className="mj-button secondary"
              disabled={stepIndex >= solution.steps.length}
              onClick={() => { setIsPlaying(false); setStepIndex(solution.steps.length); }}
            >
              全部铺满
            </button>
          </div>}
          <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#556c67' }}>
            已放置：<strong>{manual ? manualTiles.length : stepIndex}</strong> / {solution.steps.length} 块 L 型骨牌
          </p>
        </section>

        {/* 右栏：数学归纳法推导与解析 */}
        <div>
          <section className="mj-panel">
            <details className="tromino-proof-details">
              <summary className="tromino-proof-summary">
                <span>证明</span>
                <span className="tromino-proof-toggle-hint">点击展开 / 收起</span>
              </summary>
              <div className="tromino-proof-body">
                <h3 style={{ margin: '0 0 14px', font: '700 20px/1.35 Georgia, serif', color: '#182d32' }}>数学归纳法证明</h3>
                <div className="tromino-formula-box">
                  <strong style={{ display: 'block', marginBottom: '6px', color: '#116a64' }}>
                    待证命题：
                  </strong>
                  <p style={{ margin: 0, fontSize: '15px' }}>
                    每个大小为 <MathFormula tex={String.raw`2^n \times 2^n`} /> 的棋盘，随便挖掉哪一个格子，剩下的部分都能用 L 型骨牌正好铺满。
                  </p>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <span className="mj-kicker">BASE CASE</span>
                  <h3 style={{ margin: '6px 0 10px', fontSize: '18px' }}>先看 <MathFormula tex={String.raw`2\times2`} /> 棋盘</h3>
                  <p>
                    棋盘一共有 <MathFormula tex={String.raw`2 \times 2 = 4`} /> 个格子。随便挖掉哪一个，剩下的 3 个格子本身就是一块 L 型骨牌，显然成立。
                  </p>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e1e7e0' }}>
                  <span className="mj-kicker">STEP CASE</span>
                  <h3 style={{ margin: '6px 0 10px', fontSize: '18px' }}>设 <MathFormula tex="n" /> 是正整数</h3>
                  <p>
                    假设：任意大小为 <MathFormula tex={String.raw`2^n \times 2^n`} /> 的棋盘，随便拿掉一个格子都能用 L 型骨牌铺满。
                  </p>
                  <p>
                    用较小棋盘构造更大棋盘：考虑大小为 <MathFormula tex={String.raw`2^{n+1} \times 2^{n+1}`} /> 的大棋盘，其中有一个缺失格。
                  </p>
                  <ol style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
                    <li>
                      把大棋盘切成 <strong>4 个大小为 <MathFormula tex={String.raw`2^n \times 2^n`} /> 的子棋盘</strong>。
                    </li>
                    <li>
                      原来的缺失格必然落在其中<strong>某一个</strong>子棋盘里。
                    </li>
                    <li>
                      <strong>关键一步：</strong>在中心交界处，给另外 3 个完整的子棋盘各占一个角格，<strong>放上 1 块 L 型骨牌</strong>！
                    </li>
                    <li>
                      这样一来，这 3 个原本完整的子棋盘，中心各少了一个角，<strong>全变成了“缺 1 个格子的 <MathFormula tex={String.raw`2^n \times 2^n`} /> 子棋盘”</strong>。
                    </li>
                    <li>
                      根据归纳假设，这 4 个子棋盘全部都能用 L 型骨牌正好铺满！
                    </li>
                  </ol>
                  <div className="mj-formula" style={{ margin: '14px 0' }}>
                    <MathFormula display tex={String.raw`\text{总骨牌数} = 1 + 4 \times \frac{2^{2n}-1}{3} = \frac{2^{2(n+1)}-1}{3}`} />
                  </div>
                  <p>
                    所以，只要较小棋盘能铺满，更大棋盘也一定能铺满。由数学归纳法，这个结论对所有正整数 <MathFormula tex="n" /> 都成立。
                  </p>
                </div>
              </div>
            </details>
          </section>
        </div>
      </div>
    </>
  )
}
