import { useState, useEffect } from 'react'
import { solveTromino, getTileColor } from './trominoMath.js'
import { MathFormula, MathText } from './MathText.jsx'
import './tromino.css'

export function TrominoBoard({ k = 2, missR = 0, missC = 0, currentStep = -1, onSelectMiss = null }) {
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
            const tileId = grid[r][c]
            const isTiled = !isMissing && tileId > 0 && visibleTileIds.has(tileId)
            const isCurrent = tileId === currentStepTileId

            return (
              <div
                key={`${r}-${c}`}
                className={`tromino-cell ${isMissing ? 'missing' : ''} ${isTiled ? 'tiled' : 'empty'} ${isCurrent ? 'highlight-step' : ''}`}
                style={{
                  backgroundColor: isMissing ? undefined : (isTiled ? getTileColor(tileId) : undefined)
                }}
                title={isMissing ? `缺失方格 (${r+1}, ${c+1})` : (isTiled ? `L型骨牌 #${tileId}` : `点击设为缺失方格 (${r+1}, ${c+1})`)}
                onClick={() => {
                  if (onSelectMiss) onSelectMiss(r, c)
                }}
              >
                {isTiled ? tileId : ''}
              </div>
            )
          })
        )}
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

  const size = 1 << k
  const totalCells = size * size
  const totalTiles = (totalCells - 1) / 3
  const solution = solveTromino(k, missR, missC)

  // Clamp stepIndex when k or miss changes
  useEffect(() => {
    setStepIndex(0)
    setIsPlaying(false)
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

  const handleSelectMiss = (r, c) => {
    setMissR(r)
    setMissC(c)
  }

  const currentStepInfo = stepIndex > 0 && stepIndex <= solution.steps.length ? solution.steps[stepIndex - 1] : null

  return (
    <>
      <header className="mj-lesson-title">
        <span>03 / 棋盘覆盖与分治归纳</span>
        <h1><MathText>残缺棋盘与 L 型骨牌覆盖</MathText></h1>
        <p><MathText>任意 2ⁿ × 2ⁿ 的棋盘，挖去任意一个格子后，能否被由 3 个方格组成的 L 型骨牌完全铺满？</MathText></p>
      </header>

      <aside className="mj-principle">
        <strong>构造性数学归纳法（分治归纳）</strong>
        <p>
          在数学归纳法中，不仅可以证明“存在性”，还能通过归纳递推步骤直接给出<strong>构造方案</strong>。
          通过中心放置一块巧妙的 L 型骨牌，我们可以把一个规模为 <MathFormula tex="2^k \times 2^k" /> 的大问题，
          瞬间转化为 4 个互不干扰的 <MathFormula tex="2^{k-1} \times 2^{k-1}" /> 子问题！
        </p>
      </aside>

      <div className="mj-two-col">
        {/* 左栏：交互棋盘与动画操作 */}
        <section className="mj-panel">
          <span className="mj-kicker">INTERACTIVE TILING · 交互模拟</span>
          <h2><MathText>{`棋盘尺寸：${size} × ${size}（n = ${k}）`}</MathText></h2>

          <div className="tromino-controls">
            <label className="mj-slider" style={{ margin: 0 }}>
              选择规模 <MathFormula tex="n" />：
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className={`mj-button ${k === 1 ? '' : 'secondary'}`}
                  style={{ minHeight: '36px', padding: '6px 12px' }}
                  onClick={() => { setK(1); setMissR(0); setMissC(0); }}
                >
                  2×2 (n=1)
                </button>
                <button
                  type="button"
                  className={`mj-button ${k === 2 ? '' : 'secondary'}`}
                  style={{ minHeight: '36px', padding: '6px 12px' }}
                  onClick={() => { setK(2); setMissR(1); setMissC(2); }}
                >
                  4×4 (n=2)
                </button>
                <button
                  type="button"
                  className={`mj-button ${k === 3 ? '' : 'secondary'}`}
                  style={{ minHeight: '36px', padding: '6px 12px' }}
                  onClick={() => { setK(3); setMissR(2); setMissC(3); }}
                >
                  8×8 (n=3)
                </button>
              </div>
            </label>
          </div>

          <div className="tromino-container">
            <TrominoBoard
              k={k}
              missR={missR}
              missC={missC}
              currentStep={stepIndex - 1}
              onSelectMiss={handleSelectMiss}
            />

            <div className="tromino-info-badge">
              <span>总格数：<strong>{totalCells}</strong></span>
              <span>•</span>
              <span>缺失格：<strong>({missR + 1}, {missC + 1})</strong></span>
              <span>•</span>
              <span>需骨牌：<strong>{totalTiles}</strong> 块</span>
            </div>
            <p className="mj-legend">提示：点击棋盘中任意方格可将其设为新的“缺失格”</p>
          </div>

          <div className="tromino-controls" style={{ marginTop: '16px' }}>
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
          </div>
          <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#556c67' }}>
            已放置：<strong>{stepIndex}</strong> / {solution.steps.length} 块 L 型骨牌
          </p>
        </section>

        {/* 右栏：数学归纳法推导与解析 */}
        <div>
          <section className="mj-panel">
            <h2>数学归纳法证明</h2>
            
            <div className="tromino-formula-box">
              <strong style={{ display: 'block', marginBottom: '6px', color: '#116a64' }}>
                待证命题 <MathFormula tex="P(n)" />：
              </strong>
              <p style={{ margin: 0, fontSize: '15px' }}>
                对任意正整数 <MathFormula tex="n \ge 1" />，任意挖去一个方格的 <MathFormula tex="2^n \times 2^n" /> 棋盘，
                剩余的 <MathFormula tex="2^{2n} - 1" /> 个格子均可用 L 型骨牌无重叠完全覆盖。
              </p>
            </div>

            <div style={{ marginTop: '18px' }}>
              <span className="mj-kicker">STEP 1 · 奠基（BASE CASE）</span>
              <h3 style={{ margin: '6px 0 10px', fontSize: '18px' }}>当 <MathFormula tex="n = 1" /> 时</h3>
              <p>
                棋盘大小为 <MathFormula tex="2^1 \times 2^1 = 4" /> 个格子。挖去任意一个格子后，剩余 3 个格子恰好构成一个 L 型骨牌的形状。
                因此命题 <MathFormula tex="P(1)" /> 显然成立。
              </p>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e1e7e0' }}>
              <span className="mj-kicker">STEP 2 · 归纳假设（INDUCTIVE HYPOTHESIS）</span>
              <h3 style={{ margin: '6px 0 10px', fontSize: '18px' }}>假设当 <MathFormula tex="n = k" /> 时成立</h3>
              <p>
                即假设：任何挖去一个格子的 <MathFormula tex="2^k \times 2^k" /> 棋盘均可用 L 型骨牌完全铺满。
              </p>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e1e7e0' }}>
              <span className="mj-kicker">STEP 3 · 归纳递推（INDUCTIVE STEP）</span>
              <h3 style={{ margin: '6px 0 10px', fontSize: '18px' }}>推导 <MathFormula tex="n = k + 1" /> 的情形</h3>
              <p>
                考虑大小为 <MathFormula tex="2^{k+1} \times 2^{k+1}" /> 的棋盘，其中有一个特殊缺格。
              </p>
              <ol style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
                <li>
                  将棋盘用十字平分为 <strong>4 个大小为 <MathFormula tex="2^k \times 2^k" /> 的子棋盘</strong>。
                </li>
                <li>
                  原来的缺失格必然落在其中<strong>某一个</strong>子棋盘中。
                </li>
                <li>
                  <strong>核心关键步：</strong>在另外 3 个没有缺格的子棋盘在中心交界汇合处的 3 个角格上，
                  <strong>放置 1 块 L 型骨牌</strong>！
                </li>
                <li>
                  这样一来，这 3 个原本完整的子棋盘，中心各被这块 L 型骨牌占用了一个角格，
                  <strong>全部转化为了“含有一个缺格的 <MathFormula tex="2^k \times 2^k" /> 子棋盘”</strong>！
                </li>
                <li>
                  由归纳假设，全部 4 个子棋盘都可以被 L 型骨牌完美覆盖。
                </li>
              </ol>
              <div className="mj-formula" style={{ margin: '14px 0' }}>
                <MathFormula display tex={String.raw`\text{总骨牌数} = 1 + 4 \times \frac{2^{2k}-1}{3} = \frac{4\cdot 2^{2k} - 4 + 3}{3} = \frac{2^{2(k+1)}-1}{3}`} />
              </div>
              <p>
                至此，命题对 <MathFormula tex="n = k + 1" /> 也成立。由数学归纳法，命题对所有正整数 <MathFormula tex="n" /> 均成立！
              </p>
            </div>
          </section>

          <section className="mj-panel">
            <h2>深入思考：分治与数学归纳法</h2>
            <p>
              计算机科学中的<strong>“分治算法”（Divide & Conquer）</strong>本质上就是数学归纳法的构造性体现：
            </p>
            <ul style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
              <li><strong>汉诺塔问题</strong>：将 <MathFormula tex="n+1" /> 阶问题拆分为两次 <MathFormula tex="n" /> 阶小塔的移动与一次底盘的移动。</li>
              <li><strong>棋盘覆盖问题</strong>：将 <MathFormula tex="2^{k+1}" /> 大棋盘通过中心放置 1 块骨牌，转化为 4 个 <MathFormula tex="2^k" /> 的子棋盘独立求解。</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
