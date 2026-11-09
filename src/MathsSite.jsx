import { useEffect, useId, useRef, useState } from 'react'
import App from './App.jsx'
import Classroom, { StudentJoinView } from './Classroom.jsx'
import { valueAt, slopeAt, secantSlope, componentFunction } from './derivativeMath.js'
import { TrominoActivity } from './TrominoScreen.jsx'
import './mathsSite.css'
import { MathFormula, MathText } from './MathText.jsx'
import katex from 'katex'

const sections = ['From two points to a tangent', 'What does (2)′ mean?', 'Its own derivative', 'Why only Ceˣ?', 'Find the gap', 'Repair the claim']
function siteUrl(topic, role = null) {
  const url = new URL(window.location.href)
  url.search = topic ? `?topic=${topic}` : ''
  if (role) {
    url.searchParams.set('role', role)
  }
  url.hash = ''
  return window.location.protocol === 'file:' ? url.href : url.pathname + url.search
}
function Reveal({ title = 'Compare your reasoning', children, onToggle }) {
  return <details className="mj-reveal" onToggle={onToggle}><summary>{title}</summary><div>{children}</div></details>
}

const MATH_TOOLBAR_GROUPS = [
  {
    name: '导数/函数',
    items: [
      { label: "f'(x)", displayTex: "f'(x)", tex: "f'(x)" },
      { label: "g'(x)", displayTex: "g'(x)", tex: "g'(x)" },
      { label: "f'(a)", displayTex: "f'(a)", tex: "f'(a)" },
      { label: "eˣ", displayTex: "e^x", tex: "e^x" },
      { label: "Ceˣ", displayTex: "Ce^x", tex: "Ce^x" },
      { label: "e⁻ˣ", displayTex: "e^{-x}", tex: "e^{-x}" },
      { label: "x²", displayTex: "x^2", tex: "x^2" },
      { label: "f'=f", displayTex: "f'=f", tex: "f'(x)=f(x)" },
    ],
  },
  {
    name: '模板 (MathType)',
    items: [
      { label: 'a/b', displayTex: '\\frac{a}{b}', tex: '\\frac{a}{b}', isFraction: true },
      { label: 'xⁿ', displayTex: 'x^n', tex: '^{n}', isSup: true },
      { label: 'xₙ', displayTex: 'x_n', tex: '_{n}', isSub: true },
      { label: 'lim', displayTex: '\\lim', tex: '\\lim_{x \\to 0}' },
      { label: '√x', displayTex: '\\sqrt{x}', tex: '\\sqrt{x}', isSqrt: true },
      { label: '$...$', displayTex: '$...$', tex: '$ $', isWrapper: true },
    ],
  },
  {
    name: '符号',
    items: [
      { label: '∞', displayTex: '\\infty', tex: '\\infty' },
      { label: '≠', displayTex: '\\neq', tex: '\\neq' },
      { label: '→', displayTex: '\\to', tex: '\\to' },
      { label: '±', displayTex: '\\pm', tex: '\\pm' },
      { label: '·', displayTex: '\\cdot', tex: '\\cdot' },
      { label: '≤', displayTex: '\\le', tex: '\\le' },
      { label: '≥', displayTex: '\\ge', tex: '\\ge' },
    ],
  },
]

function renderMathNote(content) {
  if (!content) return null
  const tokens = content.split(/(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g)
  return tokens.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
      const tex = part.slice(2, -2).trim()
      try {
        const html = katex.renderToString(tex, { displayMode: true, throwOnError: false })
        return <div key={index} className="mj-typeset-display" dangerouslySetInnerHTML={{ __html: html }} />
      } catch {
        return <code key={index}>{part}</code>
      }
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const tex = part.slice(1, -1).trim()
      try {
        const html = katex.renderToString(tex, { displayMode: false, throwOnError: false })
        return <span key={index} className="mj-typeset-inline" dangerouslySetInnerHTML={{ __html: html }} />
      } catch {
        return <code key={index}>{part}</code>
      }
    }
    return <MathText key={index}>{part}</MathText>
  })
}

function Note({ id, children }) {
  const [text, setText] = useState(() => {
    try { return sessionStorage.getItem(`mj:${id}`) || '' } catch { return '' }
  })
  const [submittedTime, setSubmittedTime] = useState(() => {
    try { return sessionStorage.getItem(`mj:sub_at:${id}`) || null } catch { return null }
  })
  const [submittedText, setSubmittedText] = useState(() => {
    try { return sessionStorage.getItem(`mj:sub_val:${id}`) || '' } catch { return '' }
  })
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef(null)

  const isDirty = submittedTime !== null && text !== submittedText

  const handleInsert = (item) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart ?? text.length
    const end = textarea.selectionEnd ?? text.length
    const selected = text.slice(start, end)

    const textBefore = text.slice(0, start)
    const dollarsBefore = (textBefore.match(/(?<!\\)\$/g) || []).length
    const insideMath = dollarsBefore % 2 === 1

    let insertion = ''
    let cursorOffset = 0

    if (item.isWrapper) {
      if (selected) {
        insertion = `$${selected}$`
        cursorOffset = insertion.length
      } else {
        insertion = `$  $`
        cursorOffset = 2
      }
    } else if (item.isFraction) {
      const num = selected || 'a'
      const code = insideMath ? `\\frac{${num}}{b}` : `$\\frac{${num}}{b}$`
      insertion = code
      cursorOffset = insideMath ? code.length - 2 : code.length - 3
    } else if (item.isSup) {
      const code = selected ? `${selected}^{n}` : `^{n}`
      insertion = insideMath ? code : `$${code}$`
      cursorOffset = insertion.length - (insideMath ? 2 : 3)
    } else if (item.isSub) {
      const code = selected ? `${selected}_{n}` : `_{n}`
      insertion = insideMath ? code : `$${code}$`
      cursorOffset = insertion.length - (insideMath ? 2 : 3)
    } else if (item.isSqrt) {
      const val = selected || 'x'
      const code = insideMath ? `\\sqrt{${val}}` : `$\\sqrt{${val}}$`
      insertion = code
      cursorOffset = insertion.length
    } else {
      insertion = insideMath ? item.tex : `$${item.tex}$`
      cursorOffset = insertion.length
    }

    const nextText = text.slice(0, start) + insertion + text.slice(end)
    setText(nextText)
    try {
      sessionStorage.setItem(`mj:${id}`, nextText)
    } catch {}

    setTimeout(() => {
      textarea.focus()
      const targetPos = start + cursorOffset
      textarea.setSelectionRange(targetPos, targetPos)
    }, 0)
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!text.trim()) return
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    try {
      sessionStorage.setItem(`mj:${id}`, text)
      sessionStorage.setItem(`mj:sub_at:${id}`, timeStr)
      sessionStorage.setItem(`mj:sub_val:${id}`, text)
    } catch {}
    setSubmittedTime(timeStr)
    setSubmittedText(text)
  }

  return (
    <div className="mj-note">
      <div className="mj-note-prompt">{children}</div>
      <div className="mj-note-box">
        <div className="mj-note-toolbar">
          <div className="mj-note-toolbar-header">
            <span className="mj-note-toolbar-title">插入数学符号 / MathType &amp; LaTeX</span>
            <button
              type="button"
              className={`mj-note-preview-toggle ${showPreview ? 'active' : ''}`}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? '隐藏公式预览 ✕' : '实时公式预览 👁'}
            </button>
          </div>
          <div className="mj-note-groups">
            {MATH_TOOLBAR_GROUPS.map((grp) => (
              <div key={grp.name} className="mj-note-group">
                <span className="mj-note-group-label">{grp.name}:</span>
                {grp.items.map((item) => {
                  let rendered = item.label
                  if (item.displayTex) {
                    try {
                      rendered = (
                        <span
                          dangerouslySetInnerHTML={{
                            __html: katex.renderToString(item.displayTex, {
                              displayMode: false,
                              throwOnError: false,
                            }),
                          }}
                        />
                      )
                    } catch {
                      rendered = item.label
                    }
                  }
                  return (
                    <button
                      key={item.label}
                      type="button"
                      className="mj-math-btn"
                      title={`插入 ${item.tex}`}
                      onClick={() => handleInsert(item)}
                    >
                      {rendered}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          rows={3}
          value={text}
          placeholder="写下你的思考、推导或疑问（可使用上方按钮插入数学公式，如 $f'(x)$ 或 $g(x)=\frac{f(x)}{e^x}$）…"
          onChange={(event) => {
            setText(event.target.value)
            try {
              sessionStorage.setItem(`mj:${id}`, event.target.value)
            } catch {
              /* Notes remain usable without storage. */
            }
          }}
        />
        {showPreview && (
          <div className="mj-note-preview">
            <div className="mj-note-preview-label">公式排版实时预览 (Formula Preview)</div>
            <div className="mj-note-preview-body">
              {text.trim() ? renderMathNote(text) : <span style={{ color: '#8c9e94' }}>暂无内容，请在上方输入或插入数学公式…</span>}
            </div>
          </div>
        )}
      </div>
      <div className="mj-note-footer">
        <div>
          {submittedTime ? (
            isDirty ? (
              <span className="mj-note-status is-draft">✎ 有未提交的草稿修改（上次提交：{submittedTime}）</span>
            ) : (
              <span className="mj-note-status is-submitted">✓ 已提交回答（{submittedTime}）</span>
            )
          ) : (
            <span className="mj-note-status is-unsubmitted">笔记与提交记录保存在当前标签页</span>
          )}
        </div>
        <button
          type="button"
          className="mj-note-submit-btn"
          disabled={!text.trim() || (!isDirty && submittedTime !== null)}
          onClick={handleSubmit}
        >
          {submittedTime === null ? '提交回答 (Submit)' : isDirty ? '更新提交 (Update)' : '已提交 ✓'}
        </button>
      </div>
    </div>
  )
}
function Graph({ kind, a, c = 2, h = null, tangent = false, disconnected = false }) {
  const clipId = useId()
  const X = x => 280 + 64 * x
  const Y = y => 230 - (kind === 'square' ? 14 : 27) * y
  const y = disconnected ? componentFunction(a) : valueAt(kind, a, c)
  const m = slopeAt(kind, a, c)
  const path = (fn, left, right) => Array.from({ length: 161 }, (_, i) => { const x = left + (right - left) * i / 160; return `${i ? 'L' : 'M'}${X(x)},${Y(fn(x))}` }).join(' ')
  return <svg className="mj-graph" viewBox="0 0 560 330" role="img" aria-label={disconnected ? 'Two exponential branches, with x equals one excluded and the value at zero equal to one' : `Graph of ${kind === 'constant' ? `f(x) = ${c}` : kind === 'square' ? 'g(x) = x squared' : `f(x) = ${c} e to the x`}${tangent ? ', with a tangent at the selected point' : ''}`}>
    <defs><clipPath id={clipId}><rect x="25" y="15" width="510" height="285" /></clipPath></defs>
    {[-3,-2,-1,0,1,2,3,4].map(x => <g key={x}><path d={`M${X(x)},20V295`} className="mj-grid" /><text x={X(x)} y="251" textAnchor="middle">{x}</text></g>)}
    {(kind === 'square' ? [-2,0,4,8,12] : [-2,0,2,4,6]).map(v => <g key={v}><path d={`M25,${Y(v)}H535`} className="mj-grid" /><text x="265" y={Y(v)-4} textAnchor="end">{v}</text></g>)}
    <path d={`M25,230H535 M280,20V300`} className="mj-axis" /><text x="540" y="225">x</text><text x="289" y="24">y</text>
    <g clipPath={`url(#${clipId})`}>
      {disconnected ? <><path d={path(x => Math.exp(x), -4, .999)} className="mj-curve" /><path d={path(x => 2*Math.exp(x), 1.001, 4)} className="mj-curve alt" /><circle cx={X(1)} cy={Y(Math.E)} r="5" className="mj-hole" /><circle cx={X(1)} cy={Y(2*Math.E)} r="5" className="mj-hole" /><circle cx={X(0)} cy={Y(1)} r="6" className="mj-point" /></> : <>
        <path d={path(x => valueAt(kind, x, c), -4, 4)} className="mj-curve" />
        {tangent && <path d={path(x => y + m * (x-a), -4, 4)} className="mj-tangent" />}
        {h !== null && h !== 0 && <><path d={path(x => y + secantSlope(kind,a,h,c)*(x-a), -4,4)} className="mj-secant" /><circle cx={X(a+h)} cy={Y(valueAt(kind,a+h,c))} r="5" className="mj-point second" /></>}
        <circle cx={X(a)} cy={Y(y)} r="6" className="mj-point" />
      </>}
    </g>
    <text x="32" y="320">{disconnected ? 'F(0) = 1; x = 1 is outside the domain' : `Selected point: (${a.toFixed(1)}, ${y.toFixed(2)})`}</text>
  </svg>
}
function ConstantActivity({onAnswerStatusChange, isTeacher = false, expandAll = false}) {
  const [a,setA] = useState(1), [shown,setShown] = useState(false)
  const [choice,setChoice] = useState(''), [submitted,setSubmitted] = useState(false)

  useEffect(() => {
    if (expandAll) {
      setShown(true)
      setChoice('function')
      setSubmitted(true)
      onAnswerStatusChange(true)
    }
  }, [expandAll, onAnswerStatusChange])

  const isShown = expandAll || shown
  const isSelected = expandAll ? 'function' : choice
  const isSub = expandAll || submitted

  return <>
    <header className="mj-lesson-title"><span>02 / THE CONSTANT FUNCTION</span><h1><MathText>What does (2)′ mean?</MathText></h1><p><MathText>A number, a function, and a value of a derivative are different things.</MathText></p></header>
    <aside className="mj-principle"><strong>Differentiation applies to functions.</strong><p>If <MathFormula tex="f" /> is differentiable at <MathFormula tex="a" />, <MathFormula tex="f'(a)" /> is the slope of the tangent to <MathFormula tex="y=f(x)" /> at <MathFormula tex="x=a" />. The bare number 2 does not specify a function. In <MathFormula tex="(2)'" />, the expression 2 stands for the constant function <MathFormula tex="f(x)=2" />, differentiated with respect to <MathFormula tex="x" />.</p></aside>
    <div className="mj-two-col"><section className="mj-panel"><span className="mj-kicker">ONE FUNCTION · MANY POINTS</span><h2><MathText>Let f(x) = 2.</MathText></h2><Graph kind="constant" a={a} tangent={isShown} /><label className="mj-slider">Move the point: <MathFormula tex="a" /> = {a.toFixed(1)}<input type="range" min="-2" max="2" step=".1" value={a} onChange={e=>setA(Number(e.target.value))} /></label><p className="mj-legend">Teal: function{isShown && ' · Orange: tangent'}</p></section>
    <section className="mj-panel"><p>The function value stays at 2. What does that tell you about the tangent slope?</p><Note id="constant-slope">Explain the slope of this horizontal line.</Note><button className="mj-button" onClick={()=>setShown(!shown)}>{isShown ? 'Hide the tangent and calculation' : 'Check the tangent and calculation'}</button>{isShown && <div className="mj-feedback"><p>The vertical change is <MathFormula tex="2-2=0" /> whenever <MathFormula tex="b" /> differs from <MathFormula tex="a" />.</p><div className="mj-formula"><MathFormula display tex={String.raw`f'(a)=\lim_{b\to a}\frac{2-2}{b-a}=0`} /></div><p><MathText>The tangent is horizontal, so f′(a) = 0 at every point. Its height is 2; its slope is 0.</MathText></p></div>}</section></div>
    <section className="mj-panel"><h2><MathText>Say precisely what (2)′ = 0 means.</MathText></h2><p><MathText>Which statement names the function and explains the result?</MathText></p><fieldset className="mj-options"><legend>Choose a statement, then confirm.</legend>{[['number','The number 2 has a tangent with slope 0.'],['function','The constant function f(x) = 2 has a horizontal tangent at every point, so its derivative is 0.']].map(([value,label])=><label key={value}><input type="radio" name="constant-meaning" checked={isSelected===value} onChange={()=>{setChoice(value);setSubmitted(false);onAnswerStatusChange(false)}} /><span><MathText>{label}</MathText></span></label>)}</fieldset><button className="mj-button" disabled={!isSelected} onClick={()=>{setSubmitted(true);onAnswerStatusChange(isSelected==='function')}}>Confirm answer</button>{isSub && <div className={`mj-feedback mj-answer-feedback ${isSelected==='function' ? 'is-correct' : 'is-incorrect'}`} role="status"><strong>{isSelected==='function' ? '✓ Correct' : '✕ Incorrect — try again'}</strong><p><MathText>{isSelected==='function' ? 'You have named the function and distinguished its height from its tangent slope.' : 'A bare number has no derivative. Differentiation applies to a function. Here, 2 means the constant function f(x) = 2. Choose the statement that names the function.'}</MathText></p></div>}</section>
  </>
}
function ValueActivity({expandAll = false}) {
  const [a,setA]=useState(1),[b,setB]=useState(2)
  const secant=secantSlope('square',a,b-a)
  const tangent=slopeAt('square',a)
  const slopeX = slope => 30 + (slope+4)*40
  return <>
    <header className="mj-lesson-title"><span>01 / FROM A SECANT TO A TANGENT</span><h1>Two points. Then a tangent.</h1><p>Explore the slope of a line through two points on a curve.</p></header>
    <aside className="mj-principle"><strong>Differentiation applies to functions.</strong><p><MathFormula tex={"g'(a)"} /> is the tangent slope of the graph of <MathFormula tex="g" /> at <MathFormula tex="x=a" />, when this derivative exists.</p></aside>
    <div className="mj-two-col"><div>
      <section className="mj-panel"><h2>Let <MathFormula tex="g(x)=x^2" />.</h2><div className="mj-slope-badge secant"><span>SECANT SLOPE</span><strong>{secant===null ? 'Undefined' : secant.toFixed(2)}</strong></div><Graph kind="square" a={a} h={b-a} />
        <label className="mj-slider">Move the first point: <MathFormula tex="a" /> = {a.toFixed(1)}<input type="range" min="-2" max="2" step=".1" value={a} onChange={e=>setA(Number(e.target.value))} /></label>
        <label className="mj-slider">Move the second point: <MathFormula tex="b" /> = {b.toFixed(2)}<input type="range" min="-2" max="2" step=".02" value={b} onChange={e=>setB(Number(e.target.value))} /></label>
        <p className="mj-legend">Teal: curve and first point. Purple: second point and secant line.</p>
      </section>
    <section className="mj-panel"><h2>Now compare with the tangent.</h2><p>The separate graph below uses the same first point. Change <MathFormula tex="a" /> above to move this tangent point too.</p>
      <div className="mj-slope-badge tangent"><span>TANGENT SLOPE</span><strong>{tangent.toFixed(2)}</strong></div><Graph kind="square" a={a} tangent /><p className="mj-legend">Teal: curve. Orange: tangent at the selected point.</p><div className="mj-formula"><MathFormula display tex={`g'(${a.toFixed(1)})=${tangent.toFixed(2)}`} /></div>
    </section>
      </div>
      <section className="mj-panel"><h2>Bring the points closer.</h2><p>The points have x-coordinates <MathFormula tex="a" /> and <MathFormula tex="b" />. Keep the first point still and bring the second towards it, from either side.</p>
        <section className="mj-slope-comparison" aria-label="Live comparison of secant and tangent slopes">
          <div className="mj-slope-pair">
            <div className="mj-slope-badge secant"><span>● SECANT</span><strong>{secant===null ? 'Undefined' : secant.toFixed(2)}</strong><MathFormula tex={String.raw`\frac{g(b)-g(a)}{b-a}`} /></div>
            <div className="mj-slope-badge tangent"><span>■ TANGENT</span><strong>{tangent.toFixed(2)}</strong><MathFormula tex={String.raw`g'(a)`} /></div>
          </div>
          <svg className="mj-slope-scale" viewBox="0 0 380 90" role="img" aria-label={`Shared slope scale: secant ${secant===null ? 'undefined' : secant.toFixed(2)}, tangent ${tangent.toFixed(2)}`}>
            <line x1="30" y1="42" x2="350" y2="42" stroke="#9caaa0" strokeWidth="2" />
            {[-4,-2,0,2,4].map(value=><g key={value}><line x1={slopeX(value)} y1="36" x2={slopeX(value)} y2="48" stroke="#9caaa0" /><text x={slopeX(value)} y="70" textAnchor="middle">{value}</text></g>)}
            {secant!==null && <line x1={slopeX(secant)} y1="42" x2={slopeX(tangent)} y2="42" stroke="#82718f" strokeWidth="5" opacity=".35" />}
            <rect x={slopeX(tangent)-6} y="36" width="12" height="12" fill="#b85b18" />
            {secant!==null && <g><line x1={slopeX(secant)} y1="24" x2={slopeX(secant)} y2="42" stroke="#7545a1" strokeWidth="2" /><circle cx={slopeX(secant)} cy="21" r="6" fill="#7545a1" /></g>}
          </svg>
          <p className="mj-slope-gap">{secant===null ? 'The tangent still exists here. The secant needs two distinct points.' : <>Difference in slopes <strong>{Math.abs(secant-tangent).toFixed(2)}</strong></>}</p>
          <p>Keep <MathFormula tex="a" /> still and move <MathFormula tex="b" /> towards <MathFormula tex="a" />. Watch the purple marker approach the orange marker on the same slope scale.</p>
        </section>
        <div className="mj-formula"><MathFormula display tex={String.raw`\frac{g(b)-g(a)}{b-a}`} /></div>
        {secant===null && <p>At <MathFormula tex="b=a" /> the points coincide, so the secant quotient is undefined. Move <MathFormula tex="b" /> towards <MathFormula tex="a" /> while keeping the points distinct.</p>}
        <Note id="square-secant">What slope does the secant seem to approach? How does your answer change when you move the first point?</Note>
        <div className="mj-formula">
          <MathFormula display tex={String.raw`g'(a)=\lim_{h\to0}\frac{g(a+h)-g(a)}{h}`} />
          <MathFormula display tex={String.raw`h=b-a`} />
          <MathFormula display tex={String.raw`g'(a)=\lim_{b\to a}\frac{g(b)-g(a)}{b-a}`} />
        </div>
      </section>
    </div>

    <section className="mj-panel"><h2>What does <MathFormula tex={"g'(2)"} /> refer to?</h2><Note id="value-slope">Find <MathFormula tex={"g'(2)"} />. Explain why this is the derivative of <MathFormula tex="g" /> at <MathFormula tex="2" />, rather than a derivative of the number 2.</Note><Reveal forceOpen={expandAll}><p><MathText>g′(x) = 2x, so g′(2) = 4. This is the tangent slope of y = x² at x = 2.</MathText></p><p>The function and the input together identify the tangent slope. Next, compare this with a constant function.</p></Reveal></section>
  </>
}
function SelfDerivative({onReachedFinalStep, isTeacher = false, expandAll = false}) {
  const [step,setStep]=useState(0),[c,setC]=useState(1),[a,setA]=useState(0)

  useEffect(() => {
    if (expandAll) {
      setStep(4)
      onReachedFinalStep()
    }
  }, [expandAll, onReachedFinalStep])

  const activeStep = expandAll ? 4 : step

  return <><header className="mj-lesson-title"><span>03 / EXAMPLES, THEN A CLAIM</span><h1><MathText>Can a function be its own derivative?</MathText></h1><p><MathText>First find an example. Then decide what your examples actually establish.</MathText></p></header>
    <section className="mj-panel">
      <h2><MathText>Give an example of a function with f′ = f.</MathText></h2>
      <Note id="self-first"><MathText>Write your function and explain how you checked it.</MathText></Note>
      {activeStep===0 && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="mj-button" onClick={()=>setStep(1)}>I have an example. Is it the only one?</button>
          {isTeacher && <button className="mj-button secondary" onClick={()=>{setStep(4);onReachedFinalStep()}}>展开本页全部步骤</button>}
        </div>
      )}
      {isTeacher && !expandAll && activeStep > 0 && (
        <div style={{ marginTop: '10px' }}>
          {activeStep < 4 ? (
            <button className="mj-button secondary" style={{ fontSize: '12px', minHeight: '32px', padding: '4px 10px' }} onClick={()=>{setStep(4);onReachedFinalStep()}}>展开本页余下步骤</button>
          ) : (
            <button className="mj-button secondary" style={{ fontSize: '12px', minHeight: '32px', padding: '4px 10px' }} onClick={()=>setStep(0)}>重新逐步演示 ↺</button>
          )}
        </div>
      )}
    </section>
    {activeStep>=1 && <section className="mj-panel"><h2><MathText>Is that the only one?</MathText></h2><Note id="self-another"><MathText>Can you find a different nonzero example? Check its derivative.</MathText></Note>{activeStep===1 && <button className="mj-button" onClick={()=>setStep(2)}>Consider a whole family</button>}</section>}
    {activeStep>=2 && <section className="mj-panel"><h2><MathText>Let C be a real number. What about f(x) = Ceˣ?</MathText></h2><p><MathText>Check that its derivative equals the function. Could every example have this form?</MathText></p><Graph kind="exp" c={c} a={a} tangent /><label className="mj-slider"><MathFormula tex="C" /> = {c.toFixed(1)}<input type="range" min="-2" max="2" step=".1" value={c} onChange={e=>setC(Number(e.target.value))} /></label><label className="mj-slider"><MathFormula tex="a" /> = {a.toFixed(1)}<input type="range" min="-1" max="1" step=".1" value={a} onChange={e=>setA(Number(e.target.value))} /></label><p className="mj-legend"><MathText>Teal: function · Orange: tangent. The graph illustrates examples; it does not prove they are the only ones.</MathText></p>{activeStep===2 && <button className="mj-button" onClick={()=>setStep(3)}>Check a constant function</button>}</section>}
    {activeStep>=3 && <section className="mj-panel"><h2><MathText>Is the zero function an example?</MathText></h2><Note id="zero"><MathText>Does f(x) = 0 satisfy f′ = f? Is it included in Ceˣ?</MathText></Note><Reveal forceOpen={expandAll}><p><MathText>Its derivative is 0, which is the function itself. It belongs to the family with C = 0.</MathText></p></Reveal>{activeStep===3 && <button className="mj-button" onClick={()=>{setStep(4);onReachedFinalStep()}}>Could there be something else?</button>}</section>}
    {activeStep>=4 && <section className="mj-panel"><h2><MathText>Do you believe these are the only examples?</MathText></h2><Note id="only"><MathText>What would convince you there is no different kind of example?</MathText></Note><p><MathText>Examples show that this family works. They do not prove that these are the only solutions.</MathText></p></section>}
  </>
}
function ProofActivity({onReachedFinalStep, isTeacher = false, expandAll = false}) {
  const [step,setStep]=useState(0)
  const advance=()=>setStep(step+1)

  useEffect(() => {
    if (expandAll) {
      setStep(4)
      onReachedFinalStep()
    }
  }, [expandAll, onReachedFinalStep])

  const activeStep = expandAll ? 4 : step

  return <>
    <header className="mj-lesson-title"><span>04 / FROM EXAMPLES TO A CLAIM</span><h1>Why Is the Solution Unique?</h1><p>Suppose <MathFormula tex="f'(x)=f(x)" />. We have not chosen a special function <MathFormula tex="f" />. Work through one question at a time.</p></header>
    <section className="mj-panel">
      <span className="mj-kicker">QUESTION 1 / COMPARE THE FUNCTIONS</span>
      <h2>What would show that <MathFormula tex="f" /> is a constant multiple of <MathFormula tex="e^x" />?</h2>
      <p>Define <MathFormula tex={String.raw`g(x)=\frac{f(x)}{e^x}`} />. The denominator is never zero. What would <MathFormula tex="g" /> look like if <MathFormula tex="f(x)=Ce^x" />?</p>
      <Note id="proof-compare">Describe the new function <MathFormula tex="g" /> before calculating its derivative.</Note>
      <Reveal forceOpen={expandAll}><p>If <MathFormula tex="f(x)=Ce^x" />, then <MathFormula tex="g(x)=C" />: <MathFormula tex="g" /> would be constant. Can <MathFormula tex="f'(x)=f(x)" /> lead us there?</p></Reveal>
      {activeStep===0 && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="mj-button" onClick={advance}>Differentiate <MathFormula tex="g" /> →</button>
          {isTeacher && <button className="mj-button secondary" onClick={()=>{setStep(4);onReachedFinalStep()}}>展开本页全部问题</button>}
        </div>
      )}
      {isTeacher && !expandAll && activeStep > 0 && (
        <div style={{ marginTop: '10px' }}>
          {activeStep < 4 ? (
            <button className="mj-button secondary" style={{ fontSize: '12px', minHeight: '32px', padding: '4px 10px' }} onClick={()=>{setStep(4);onReachedFinalStep()}}>展开本页余下问题</button>
          ) : (
            <button className="mj-button secondary" style={{ fontSize: '12px', minHeight: '32px', padding: '4px 10px' }} onClick={()=>setStep(0)}>重新逐步演示 ↺</button>
          )}
        </div>
      )}
    </section>
    {activeStep>=1 && <section className="mj-panel"><span className="mj-kicker">QUESTION 2 / DIFFERENTIATE</span><h2>What is <MathFormula tex="g'(x)" />?</h2><p>Rewrite <MathFormula tex={String.raw`g(x)=e^{-x}f(x)`} />. Keep <MathFormula tex="f'(x)" /> in your answer for now.</p><Note id="proof-quotient">Write your derivative before opening the answer.</Note><Reveal forceOpen={expandAll}><p>Use the <strong>product rule</strong>. The quotient rule works too.</p><div className="mj-formula"><MathFormula display tex={String.raw`g'(x)=-e^{-x}f(x)+e^{-x}f'(x)=e^{-x}\bigl(f'(x)-f(x)\bigr)`} /></div></Reveal>{activeStep===1 && <button className="mj-button" onClick={advance}>Use <MathFormula tex="f'=f" /> →</button>}</section>}
    {activeStep>=2 && <section className="mj-panel"><span className="mj-kicker">QUESTION 3 / USE THE CONDITION</span><h2>What does <MathFormula tex="f'(x)=f(x)" /> make <MathFormula tex="g'(x)" /> equal?</h2><Note id="proof-zero">Substitute the condition into your expression for <MathFormula tex="g'(x)" />.</Note><Reveal forceOpen={expandAll}><div className="mj-formula"><MathFormula display tex={String.raw`g'(x)=e^{-x}\bigl(f(x)-f(x)\bigr)=0`} /></div></Reveal>{activeStep===2 && <button className="mj-button" onClick={advance}>Assume <MathFormula tex="g" /> is constant →</button>}</section>}
    {activeStep>=3 && <section className="mj-panel"><span className="mj-kicker">QUESTION 4 / LOOK AT ZERO</span><h2>Assume <MathFormula tex="g(x)=C" /> is a constant function. What is <MathFormula tex="g(0)" />?</h2><Note id="proof-constant">Use the assumption that <MathFormula tex="g" /> is constant.</Note><Reveal forceOpen={expandAll}><div className="mj-formula"><MathFormula display tex={String.raw`g(0)=C`} /></div></Reveal>{activeStep===3 && <button className="mj-button" onClick={advance}>Add one more condition →</button>}</section>}
    {activeStep>=4 && <section className="mj-panel"><span className="mj-kicker">QUESTION 5 / THE CLAIM</span><h2>Now also suppose <MathFormula tex="f(0)=1" />. What is <MathFormula tex="f(x)" />?</h2><Note id="proof-unique">Use <MathFormula tex="g(0)=C" /> from Question 4 and the definition of <MathFormula tex="g" />.</Note><Reveal title="Reveal our conclusion" forceOpen={expandAll} onToggle={event=>{if(event.currentTarget.open) onReachedFinalStep()}}><div className="mj-formula"><MathFormula display tex={String.raw`g(0)=\frac{f(0)}{e^0}=1\qquad\Longrightarrow\qquad C=1`} /><MathFormula display tex={String.raw`f(x)=g(x)e^x=Ce^x=e^x`} /></div><div className="mj-proof-claim"><strong>OUR CLAIM: EXACTLY ONE FUNCTION</strong><div className="mj-proof-conditions"><MathFormula tex="f'(x)=f(x)" /><span>and</span><MathFormula tex="f(0)=1" /></div><p>We began with an unspecified <MathFormula tex="f" />. Our argument says these two conditions force <MathFormula tex="f(x)=e^x" />. Is that conclusion secure?</p></div></Reveal><p className="mj-legend">{isTeacher ? '结论与推导已就绪，可随时继续。' : 'Open the conclusion before continuing.'}</p></section>}
  </>
}
function DomainActivity({onFoundGap, isTeacher = false, expandAll = false}) {
  useEffect(() => {
    if (expandAll) {
      onFoundGap()
    }
  }, [expandAll, onFoundGap])
  return <><header className="mj-lesson-title"><span>05 / CHECK THE CLAIM</span><h1>Breaking news: a major gap</h1><div className="mj-proof-alert"><strong>Our previous claim needs another condition.</strong><p>We said <MathFormula tex="f'(x)=f(x)" /> and <MathFormula tex="f(0)=1" /> force <MathFormula tex="f(x)=e^x" />. Can you find a function that breaks this claim?</p></div></header><div className="mj-two-col"><section className="mj-panel"><h2>One function, two separated pieces</h2><p>Its domain is <MathFormula tex={String.raw`(-\infty,1)\cup(1,\infty)`} />.</p><div className="mj-formula"><MathFormula display tex={String.raw`F(x)=\begin{cases}e^x,&x<1,\\2e^x,&x>1.\end{cases}`} /></div><Graph kind="exp" a={0} disconnected /><p>The hollow points show that <MathFormula tex="x=1" /> is excluded. The solid point is <MathFormula tex="F(0)=1" />.</p></section><section className="mj-panel"><h2>Test all three claims</h2><Note id="domain">Does <MathFormula tex="F'(x)=F(x)" /> hold wherever this function is defined? Is <MathFormula tex="F(0)=1" />? Must <MathFormula tex="F(x)=e^x" /> everywhere on its domain?</Note><Reveal title="Reveal the counterexample" forceOpen={expandAll} onToggle={event=>{if(event.currentTarget.open) onFoundGap()}}><p>On the left piece, <MathFormula tex="F'(x)=F(x)=e^x" />. On the right piece, <MathFormula tex="F'(x)=F(x)=2e^x" />. Also <MathFormula tex="F(0)=1" />, yet <MathFormula tex={String.raw`F(2)=2e^2\ne e^2`} />.</p><p><strong>Here is the gap:</strong> from <MathFormula tex="g'(x)=0" />, we can conclude that <MathFormula tex="g" /> is constant on each connected interval. We cannot assume one common constant across separated pieces.</p></Reveal></section></div><p className="mj-legend">{isTeacher ? "提示：可展开查看反例，或直接点击下方按钮继续。" : "Open the counterexample before continuing."}</p></>
}
function CorrectedClaim({isTeacher = false, expandAll = false}) {
  return <>
    <header className="mj-lesson-title"><span>06 / REPAIR THE CLAIM</span><h1>The missing third condition</h1><p>The counterexample satisfies the first two conditions. Its domain breaks into two pieces.</p></header>
    <section className="mj-panel"><h2>What must we add?</h2><div className="mj-proof-alert"><strong>The two equations alone are not enough.</strong><p>We also need to know where the function is defined.</p></div><div className="mj-proof-claim"><strong>THREE CONDITIONS FOR ONE SOLUTION</strong><div className="mj-proof-conditions"><MathFormula tex="f'(x)=f(x)" /><span>and</span><MathFormula tex="f(0)=1" /></div><p className="mj-domain-condition"><strong>Plus:</strong> the domain of <MathFormula tex="f" /> is one specified, unbroken interval containing <MathFormula tex="0" /> (a connected interval).</p></div><div className="mj-formula"><MathFormula display tex={String.raw`f(x)=e^x\quad\text{for every }x\text{ in that interval}`} /></div><Note id="domain-repair">Look back at the step from <MathFormula tex="g'(x)=0" /> to one constant <MathFormula tex="C" />. Why does the third condition justify that step?</Note><Reveal title="Explain the repaired reasoning" forceOpen={expandAll}><p>On one interval, <MathFormula tex="g'(x)=0" /> makes <MathFormula tex="g" /> constant throughout that interval. The value <MathFormula tex="f(0)=1" /> sets that constant to <MathFormula tex="1" />. Thus <MathFormula tex="e^x" /> is the unique solution on the specified interval.</p><p>With separated pieces, the constant can change from one piece to another.</p></Reveal></section>
  </>
}
export default function MathsSite() {
  const params = new URLSearchParams(window.location.search)
  // Students get the default site; the teacher site (with the standalone activity) needs ?role=teacher.
  const role = params.get('role') === 'teacher' ? 'teacher' : 'student'
  const isStudent = role === 'student'
  const topic = params.get('topic') || (window.__MR_JIANG_OFFLINE_DERIVATIVES__ ? 'derivatives' : null)
  const legacy = ['join','teacher','classroom','stage','code'].some(key=>params.has(key)) || /access_token|type=recovery|code=/.test(window.location.hash)
  const [page,setPage]=useState(0)
  const [constantPassed,setConstantPassed]=useState(false)
  const [selfDerivativeFinished,setSelfDerivativeFinished]=useState(false)
  const [proofFinished,setProofFinished]=useState(false)
  const [gapSeen,setGapSeen]=useState(false)
  useEffect(()=>{ 
    if(topic!=='induction' && !legacy) {
      document.title = topic==='derivatives' 
        ? 'Derivatives · Mr Jiang Maths' 
        : topic==='tromino' 
          ? 'Tromino Tiling · Mr Jiang Maths' 
          : isStudent 
            ? 'Student Portal · Mr Jiang Maths' 
            : 'Mr Jiang Maths';
      document.documentElement.lang='en'
    } 
  },[topic,legacy,isStudent])
  if (!topic && (params.has('join') || params.has('teacher') || params.has('classroom'))) return <Classroom />
  if(topic==='induction' || (!topic && legacy)) {
    if (isStudent) {
      return (
        <div className="mj-site">
          <div className="mj-topbar">
            <a className="mj-brand" href={siteUrl('', 'student')}>Mr Jiang<span>Maths (Student)</span></a>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <a href={siteUrl('', 'student')}>← 返回首页 (Home)</a>
            </div>
          </div>
          <main className="mj-lesson">
            <StudentJoinView defaultCode={params.get('code') || ''} />
          </main>
        </div>
      )
    }
    return <><a className="mj-return" href={siteUrl('', role)}>← Mr Jiang Maths</a><App onOpenClassroom={() => { location.href = location.pathname + '?classroom=1' }} /></>
  }
  if(topic==='tromino') return <div className="mj-site"><div className="mj-topbar"><a className="mj-brand" href={siteUrl('', role)}>Mr Jiang<span>Maths</span></a><div style={{ display: 'flex', gap: '16px' }}><a href={siteUrl('induction', role)}>Hanoi Tower ↗</a><a href={siteUrl('derivatives', role)}>Derivatives ↗</a></div></div><main className="mj-lesson"><TrominoActivity /></main></div>
  const isTeacher = role === 'teacher'
  const [expandAll, setExpandAll] = useState(() => {
    try {
      const stored = sessionStorage.getItem('mj:teacher_expand')
      return stored !== null ? stored === 'true' : true
    } catch {
      return true
    }
  })

  if(topic==='derivatives') return <div className="mj-site"><div className="mj-topbar"><a className="mj-brand" href={siteUrl('', role)}>Mr Jiang<span>Maths</span></a><div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}><span className={`mj-role-badge ${isTeacher ? 'teacher' : 'student'}`}>{isTeacher ? '教师版 · Teacher' : '学生版 · Student'}</span>{isTeacher && <div style={{ display: 'inline-flex', alignItems: 'center', background: '#dce8e0', border: '1px solid #b8cec0', borderRadius: '20px', padding: '2px', fontSize: '12px' }}><button type="button" style={{ border: 'none', background: expandAll ? '#116a64' : 'transparent', color: expandAll ? '#ffffff' : '#335049', borderRadius: '16px', padding: '4px 10px', fontWeight: expandAll ? '700' : '500', cursor: 'pointer', fontSize: '12px', transition: 'background 0.15s, color 0.15s' }} onClick={() => { setExpandAll(true); try { sessionStorage.setItem('mj:teacher_expand', 'true') } catch {} }}>全部展开 (All Expanded)</button><button type="button" style={{ border: 'none', background: !expandAll ? '#116a64' : 'transparent', color: !expandAll ? '#ffffff' : '#335049', borderRadius: '16px', padding: '4px 10px', fontWeight: !expandAll ? '700' : '500', cursor: 'pointer', fontSize: '12px', transition: 'background 0.15s, color 0.15s' }} onClick={() => { setExpandAll(false); try { sessionStorage.setItem('mj:teacher_expand', 'false') } catch {} }}>逐步演示 (Step-by-step)</button></div>}{window.__MR_JIANG_OFFLINE_DERIVATIVES__ ? <span>Offline student copy</span> : <a href={siteUrl('induction', role)}>Mathematical induction ↗</a>}</div></div><main className="mj-lesson"><nav className="mj-tabs" aria-label="Derivative activities">{sections.map((name,i)=><button key={name} aria-current={i===page?'step':undefined} disabled={!isTeacher && ((i>1 && !constantPassed) || (i>2 && !selfDerivativeFinished) || (i>3 && !proofFinished) || (i===5 && !gapSeen))} onClick={()=>{setPage(i);window.scrollTo(0,0)}}><span>0{i+1}</span><MathText>{name}</MathText></button>)}</nav>{[<ValueActivity expandAll={isTeacher && expandAll} />,<ConstantActivity onAnswerStatusChange={setConstantPassed} isTeacher={isTeacher} expandAll={isTeacher && expandAll} />,<SelfDerivative onReachedFinalStep={()=>setSelfDerivativeFinished(true)} isTeacher={isTeacher} expandAll={isTeacher && expandAll} />,<ProofActivity onReachedFinalStep={()=>setProofFinished(true)} isTeacher={isTeacher} expandAll={isTeacher && expandAll} />,<DomainActivity onFoundGap={()=>setGapSeen(true)} isTeacher={isTeacher} expandAll={isTeacher && expandAll} />,<CorrectedClaim isTeacher={isTeacher} expandAll={isTeacher && expandAll} />].map((element,i)=><div key={i} hidden={i!==page}>{element}</div>)}<footer className="mj-footer"><button className="mj-button secondary" disabled={page===0} onClick={()=>{setPage(page-1);window.scrollTo(0,0)}}>← Back</button><span>{page+1} / 6</span><button className="mj-button" disabled={page===5 || (!isTeacher && ((page===1 && !constantPassed) || (page===2 && !selfDerivativeFinished) || (page===3 && !proofFinished) || (page===4 && !gapSeen)))} onClick={()=>{setPage(page+1);window.scrollTo(0,0)}}>Continue →</button></footer></main></div>
  return <div className="mj-site"><div className="mj-topbar"><a className="mj-brand" href={siteUrl('', role)}>Mr Jiang<span>Maths</span></a><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span className={`mj-role-badge ${isStudent ? 'student' : 'teacher'}`}>{isStudent ? '学生版 · Student' : '教师版 · Teacher'}</span>{!isStudent && <a className="mj-switch-role" href={siteUrl('', 'student')}>预览学生端 ↗</a>}</div></div><main className="mj-home"><header><span className="mj-kicker">{isStudent ? 'STUDENT LEARNING PORTAL · 学生探索' : 'TEACHER & PRESENTATION PORTAL · 教学与演示'}</span><h1><MathText>{isStudent ? 'Explore, Question & Learn' : 'Explore the idea.<br /><em>Explain the reasoning.</em>'}</MathText></h1><p><MathText>{isStudent ? '随时加入课堂互动，体验汉诺塔归纳推导与棋盘问题。' : 'Interactive mathematics with room to try, question and prove.'}</MathText></p></header>

    <section className="mj-category-section">
      <div className="mj-category-header">
        <h2>Mathematical Induction · 数学归纳法专题</h2>
        <span>SECTION 01</span>
      </div>
      <div className="mj-courses" style={{ marginTop: '0' }}>
        <a className="mj-course induction" href={siteUrl('induction', role)}>
          <span className="mj-course-number">01 / DISCRETE RECURSION</span>
          <div className="mj-disc-art" aria-hidden="true"><i /><i /><i /><i /></div>
          <h2><MathText>Tower of Hanoi · 汉诺塔</MathText></h2>
          <p><MathText>{isStudent ? '输入教师课堂码立即加入课堂练习，参与课内互动推导。' : 'Move a tower. Build an argument. Understand how the base case and recurrence support the next stage.'}</MathText></p>
          <strong>{isStudent ? '进入课堂参与 (Join Class) ↗' : 'Enter the induction lab (Standalone) ↗'}</strong>
        </a>
        <a className="mj-course tromino" href={siteUrl('tromino', role)}>
          <span className="mj-course-number">02 / 2D TILING & DIVIDE-AND-CONQUER</span>
          <div className="mj-board-art" aria-hidden="true">
            <span style={{ background: '#2a7b72' }} />
            <span style={{ background: '#2a7b72' }} />
            <span style={{ background: '#4a6fa5' }} />
            <span style={{ background: '#4a6fa5' }} />
            <span style={{ background: '#2a7b72' }} />
            <span style={{ background: '#d97736' }} />
            <span style={{ background: '#d97736' }} />
            <span style={{ background: '#4a6fa5' }} />
            <span style={{ background: '#3f88c5' }} />
            <span style={{ background: '#d97736' }} />
            <span className="missing-cell" title="Missing square" />
            <span style={{ background: '#7a5195' }} />
            <span style={{ background: '#3f88c5' }} />
            <span style={{ background: '#3f88c5' }} />
            <span style={{ background: '#7a5195' }} />
            <span style={{ background: '#7a5195' }} />
          </div>
          <h2><MathText>Deficient Board · 残缺棋盘</MathText></h2>
          <p>Tiling a <MathFormula tex={String.raw`2^n \times 2^n`} /> board missing one square with L-trominoes. Experience constructive induction.</p>
          <strong>Explore tromino tiling <span>↗</span></strong>
        </a>
      </div>
    </section>

    <section className="mj-category-section" style={{ marginTop: '54px' }}>
      <div className="mj-category-header">
        <h2>Calculus & Analysis · 微积分专题</h2>
        <span>SECTION 02</span>
      </div>
      <div className="mj-courses" style={{ marginTop: '0', gridTemplateColumns: 'minmax(0, 1fr) 1fr' }}>
        <a className="mj-course derivatives" href={siteUrl('derivatives', role)}>
          <span className="mj-course-number">03 / DERIVATIVES & RIGOR</span>
          <div className="mj-equation-art" aria-hidden="true"><MathFormula tex={"f'=f"} /><span>What counts as an example?</span></div>
          <h2><MathText>Functions & Derivatives</MathText></h2>
          <p><MathText>What does (2)′ mean? Can a function be its own derivative? How much does the domain matter?</MathText></p>
          <strong>Explore derivatives <span>↗</span></strong>
        </a>
      </div>
    </section>

    <p className="mj-home-foot"><MathText>Start with a question. Reveal the explanation when you are ready.</MathText></p></main></div>
}