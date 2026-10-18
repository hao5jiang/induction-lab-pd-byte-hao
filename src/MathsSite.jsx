import { useEffect, useId, useState } from 'react'
import ClassroomRoot from './ClassroomRoot.jsx'
import { valueAt, slopeAt, secantSlope, componentFunction } from './derivativeMath.js'
import './mathsSite.css'
import { MathFormula, MathText } from './MathText.jsx'

const sections = ['From two points to a tangent', 'What does (2)′ mean?', 'Its own derivative', 'Does the domain matter?']
function siteUrl(topic) {
  const url = new URL(window.location.href)
  url.search = topic ? `?topic=${topic}` : ''
  url.hash = ''
  return url.pathname + url.search
}
function Reveal({ title = 'Compare your reasoning', children }) {
  return <details className="mj-reveal"><summary>{title}</summary><div>{children}</div></details>
}
function Note({ id, children }) {
  const [text, setText] = useState(() => { try { return sessionStorage.getItem(`mj:${id}`) || '' } catch { return '' } })
  return <label className="mj-note">{children}<textarea rows={3} value={text} placeholder="Write a thought, a question, or a reason…" onChange={event => { setText(event.target.value); try { sessionStorage.setItem(`mj:${id}`, event.target.value) } catch { /* Notes remain usable without storage. */ } }} /><small>Your notes stay in this browser tab; they are not submitted.</small></label>
}
function Graph({ kind, a, c = 2, h = null, tangent = false, disconnected = false }) {
  const clipId = useId()
  const X = x => 280 + 64 * x
  const Y = y => 230 - (kind === 'square' ? 14 : 27) * y
  const y = disconnected ? componentFunction(a) : valueAt(kind, a, c)
  const m = slopeAt(kind, a, c)
  const path = (fn, left, right) => Array.from({ length: 161 }, (_, i) => { const x = left + (right - left) * i / 160; return `${i ? 'L' : 'M'}${X(x)},${Y(fn(x))}` }).join(' ')
  return <svg className="mj-graph" viewBox="0 0 560 330" role="img" aria-label={disconnected ? 'Two exponential branches, with x equals zero excluded' : `Graph of ${kind === 'constant' ? `f(x) = ${c}` : kind === 'square' ? 'g(x) = x squared' : `f(x) = ${c} e to the x`}${tangent ? ', with a tangent at the selected point' : ''}`}>
    <defs><clipPath id={clipId}><rect x="25" y="15" width="510" height="285" /></clipPath></defs>
    {[-3,-2,-1,0,1,2,3,4].map(x => <g key={x}><path d={`M${X(x)},20V295`} className="mj-grid" /><text x={X(x)} y="251" textAnchor="middle">{x}</text></g>)}
    {(kind === 'square' ? [-2,0,4,8,12] : [-2,0,2,4,6]).map(v => <g key={v}><path d={`M25,${Y(v)}H535`} className="mj-grid" /><text x="265" y={Y(v)-4} textAnchor="end">{v}</text></g>)}
    <path d={`M25,230H535 M280,20V300`} className="mj-axis" /><text x="540" y="225">x</text><text x="289" y="24">y</text>
    <g clipPath={`url(#${clipId})`}>
      {disconnected ? <><path d={path(x => Math.exp(x), -4, -.001)} className="mj-curve" /><path d={path(x => 2*Math.exp(x), .001, 4)} className="mj-curve alt" /><circle cx={X(0)} cy={Y(1)} r="5" className="mj-hole" /><circle cx={X(0)} cy={Y(2)} r="5" className="mj-hole" /></> : <>
        <path d={path(x => valueAt(kind, x, c), -4, 4)} className="mj-curve" />
        {tangent && <path d={path(x => y + m * (x-a), -4, 4)} className="mj-tangent" />}
        {h !== null && h !== 0 && <><path d={path(x => y + secantSlope(kind,a,h,c)*(x-a), -4,4)} className="mj-secant" /><circle cx={X(a+h)} cy={Y(valueAt(kind,a+h,c))} r="5" className="mj-point second" /></>}
        <circle cx={X(a)} cy={Y(y)} r="6" className="mj-point" />
      </>}
    </g>
    <text x="32" y="320">{disconnected ? 'x = 0 is outside the domain' : `Selected point: (${a.toFixed(1)}, ${y.toFixed(2)})`}</text>
  </svg>
}
function ConstantActivity() {
  const [a,setA] = useState(1), [shown,setShown] = useState(false)
  const [choice,setChoice] = useState(''), [submitted,setSubmitted] = useState(false)
  return <>
    <header className="mj-lesson-title"><span>02 / THE CONSTANT FUNCTION</span><h1><MathText>What does (2)′ mean?</MathText></h1><p><MathText>A number, a function, and a value of a derivative are different things.</MathText></p></header>
    <aside className="mj-principle"><strong>Differentiation applies to functions.</strong><p><MathText>If f is differentiable at a, f′(a) is the slope of the tangent to y = f(x) at x = a. The bare number 2 does not specify a function. In (2)′, the expression 2 stands for the constant function f(x) = 2, differentiated with respect to x.</MathText></p></aside>
    <div className="mj-two-col"><section className="mj-panel"><span className="mj-kicker">ONE FUNCTION · MANY POINTS</span><h2><MathText>Let f(x) = 2.</MathText></h2><Graph kind="constant" a={a} tangent={shown} /><label className="mj-slider">Move the point: a = {a.toFixed(1)}<input type="range" min="-2" max="2" step=".1" value={a} onChange={e=>setA(Number(e.target.value))} /></label><p className="mj-legend">Teal: function{shown && ' · Orange: tangent'}</p></section>
    <section className="mj-panel"><h2>Height or slope?</h2><p>The function value stays at 2. What does that tell you about the tangent slope?</p><Note id="constant-slope">Explain the slope of this horizontal line.</Note><button className="mj-button" onClick={()=>setShown(!shown)}>{shown ? 'Hide the tangent and calculation' : 'Check the tangent and calculation'}</button>{shown && <div className="mj-feedback"><p><MathText>The vertical change is 2 − 2 = 0 whenever b differs from a.</MathText></p><div className="mj-formula"><MathFormula display tex={String.raw`f'(a)=\lim_{b\to a}\frac{2-2}{b-a}=0`} /></div><p><MathText>The tangent is horizontal, so f′(a) = 0 at every point. Its height is 2; its slope is 0.</MathText></p></div>}</section></div>
    <section className="mj-panel"><h2><MathText>Say precisely what (2)′ = 0 means.</MathText></h2><p><MathText>Which statement names the function and explains the result?</MathText></p><fieldset className="mj-options"><legend>Choose a statement, then confirm.</legend>{[['number','The number 2 has a tangent with slope 0.'],['function','The constant function f(x) = 2 has a horizontal tangent at every point, so its derivative is 0.'],['height','The derivative is 2 because the graph is at height 2.']].map(([value,label])=><label key={value}><input type="radio" name="constant-meaning" checked={choice===value} onChange={()=>{setChoice(value);setSubmitted(false)}} /><span><MathText>{label}</MathText></span></label>)}</fieldset><button className="mj-button" disabled={!choice} onClick={()=>setSubmitted(true)}>Confirm answer</button>{submitted && <p className="mj-feedback" role="status"><MathText>{choice==='function' ? 'Yes. You have named the function and distinguished its height from its tangent slope.' : choice==='number' ? 'A tangent belongs to a graph. Which function gives the horizontal line in this activity?' : 'Height and slope are different. How much does the function value change when x changes?'}</MathText></p>}</section>
  </>
}
function ValueActivity() {
  const [a,setA]=useState(1),[b,setB]=useState(2)
  const secant=secantSlope('square',a,b-a)
  return <>
    <header className="mj-lesson-title"><span>01 / FROM A SECANT TO A TANGENT</span><h1>Two points. Then a tangent.</h1><p>Explore the slope of a line through two points on a curve.</p></header>
    <aside className="mj-principle"><strong>Differentiation applies to functions.</strong><p><MathFormula tex={"g'(a)"} /> is the tangent slope of the graph of <MathFormula tex="g" /> at <MathFormula tex="x=a" />, when this derivative exists.</p></aside>
    <div className="mj-two-col">
      <section className="mj-panel"><h2>Let <MathFormula tex="g(x)=x^2" />.</h2><Graph kind="square" a={a} h={b-a} />
        <label className="mj-slider">Move the first point: a = {a.toFixed(1)}<input type="range" min="-2" max="2" step=".1" value={a} onChange={e=>setA(Number(e.target.value))} /></label>
        <label className="mj-slider">Move the second point: b = {b.toFixed(2)}<input type="range" min="-2" max="2" step=".02" value={b} onChange={e=>setB(Number(e.target.value))} /></label>
        <p className="mj-legend">Teal: curve and first point. Purple: second point and secant line.</p>
      </section>
      <section className="mj-panel"><h2>Bring the points closer.</h2><p>The points have x-coordinates <MathFormula tex="a" /> and <MathFormula tex="b" />. Keep the first point still and bring the second towards it, from either side.</p>
        <div className="mj-formula"><MathFormula display tex={String.raw`\frac{g(b)-g(a)}{b-a}`} /></div>
        <p>{secant===null ? 'At b = a the points coincide, so the secant quotient is undefined. Let b approach a while keeping the points distinct.' : <>Current secant slope: <strong>{secant.toFixed(2)}</strong></>}</p>
        <Note id="square-secant">What slope does the secant seem to approach? How does your answer change when you move the first point?</Note>
        <div className="mj-formula"><MathFormula display tex={String.raw`g'(a)=\lim_{b\to a}\frac{g(b)-g(a)}{b-a}`} /></div>
      </section>
    </div>
    <section className="mj-panel"><h2>Now compare with the tangent.</h2><p>The separate graph below uses the same first point. Change a above to move this tangent point too.</p>
      <Graph kind="square" a={a} tangent /><p className="mj-legend">Teal: curve. Orange: tangent at the selected point.</p><div className="mj-formula"><MathFormula display tex={`g'(${a.toFixed(1)})=${slopeAt('square',a).toFixed(2)}`} /></div>
    </section>
    <section className="mj-panel"><h2>What does <MathFormula tex={"g'(2)"} /> refer to?</h2><Note id="value-slope">Find <MathFormula tex={"g'(2)"} />. Explain why this is the derivative of g at 2, rather than a derivative of the number 2.</Note><Reveal><p><MathText>g′(x) = 2x, so g′(2) = 4. This is the tangent slope of y = x² at x = 2.</MathText></p><p>The function and the input together identify the tangent slope. Next, compare this with a constant function.</p></Reveal></section>
  </>
}
function SelfDerivative() {
  const [step,setStep]=useState(0),[c,setC]=useState(1),[a,setA]=useState(0)
  return <><header className="mj-lesson-title"><span>03 / EXAMPLES, THEN A CLAIM</span><h1><MathText>Can a function be its own derivative?</MathText></h1><p><MathText>First find an example. Then decide what your examples actually establish.</MathText></p></header><section className="mj-panel"><h2><MathText>Give an example of a function with f′ = f.</MathText></h2><Note id="self-first"><MathText>Write your function and explain how you checked it.</MathText></Note>{step===0 && <button className="mj-button" onClick={()=>setStep(1)}>I have an example. Is it the only one?</button>}</section>
    {step>=1 && <section className="mj-panel"><h2><MathText>Is that the only one?</MathText></h2><Note id="self-another"><MathText>Can you find a different nonzero example? Check its derivative.</MathText></Note>{step===1 && <button className="mj-button" onClick={()=>setStep(2)}>Consider a whole family</button>}</section>}
    {step>=2 && <section className="mj-panel"><h2><MathText>Let C be a real number. What about f(x) = Ceˣ?</MathText></h2><p><MathText>Check that its derivative equals the function. Could every example have this form?</MathText></p><Graph kind="exp" c={c} a={a} tangent /><label className="mj-slider">C = {c.toFixed(1)}<input type="range" min="-2" max="2" step=".1" value={c} onChange={e=>setC(Number(e.target.value))} /></label><label className="mj-slider">a = {a.toFixed(1)}<input type="range" min="-1" max="1" step=".1" value={a} onChange={e=>setA(Number(e.target.value))} /></label><p className="mj-legend"><MathText>Teal: function · Orange: tangent. The graph illustrates examples; it does not prove they are the only ones.</MathText></p>{step===2 && <button className="mj-button" onClick={()=>setStep(3)}>Check a constant function</button>}</section>}
    {step>=3 && <section className="mj-panel"><h2><MathText>Is the zero function an example?</MathText></h2><Note id="zero"><MathText>Does f(x) = 0 satisfy f′ = f? Is it included in Ceˣ?</MathText></Note><Reveal><p><MathText>Its derivative is 0, which is the function itself. It belongs to the family with C = 0.</MathText></p></Reveal>{step===3 && <button className="mj-button" onClick={()=>setStep(4)}>Could there be something else?</button>}</section>}
    {step>=4 && <section className="mj-panel"><h2><MathText>Do you believe these are the only examples?</MathText></h2><Note id="only"><MathText>What would convince you there is no different kind of example? What domain are you assuming?</MathText></Note><p><MathText>Examples establish that the family works. They do not rule out another family. Continue to examine the domain before deciding.</MathText></p></section>}
  </>
}
function DomainActivity() {
 return <><header className="mj-lesson-title"><span>04 / A CLAIM NEEDS A DOMAIN</span><h1><MathText>What if zero is missing?</MathText></h1><p><MathText>Consider the domain (−∞, 0) ∪ (0, ∞).</MathText></p></header><div className="mj-two-col"><section className="mj-panel"><h2><MathText>One function. Two separated pieces.</MathText></h2><div className="mj-formula"><MathFormula display tex={String.raw`F(x)=\begin{cases}e^x,&x<0,\\2e^x,&x>0.\end{cases}`} /></div><Graph kind="exp" a={-1} disconnected /><p><MathText>The hollow points are excluded. There is no value to check at x = 0.</MathText></p></section><section className="mj-panel"><Note id="domain"><MathText>Check F′ = F on its domain. Could one real constant C make F(x) = Ceˣ throughout this domain?</MathText></Note><Reveal><p><MathText>For x &lt; 0, F′(x) = eˣ = F(x). For x &gt; 0, F′(x) = 2eˣ = F(x).</MathText></p><p><MathText>A single C would have to equal both 1 and 2. So F′ = F does not force one common C across these separated pieces.</MathText></p></Reveal></section></div><section className="mj-panel"><h2><MathText>What can we prove on an interval?</MathText></h2><p><MathText>Let f be differentiable on an open interval I, with f′(x) = f(x) for every x in I.</MathText></p><Note id="proof"><MathText>Differentiate e⁻ˣf(x). What does its derivative tell you?</MathText></Note><Reveal title="Open the proof"><p><MathText>By the product rule,</MathText></p><div className="mj-formula"><MathFormula display tex={String.raw`\bigl[e^{-x}f(x)\bigr]'=e^{-x}\bigl[f'(x)-f(x)\bigr]=0`} /></div><p><MathText>A differentiable function with derivative zero throughout an interval is constant there, by the mean value theorem. Hence e⁻ˣf(x) = C, so f(x) = Ceˣ on I.</MathText></p><p><MathText>On separated intervals, the constant can differ from one interval to another. This is why specifying the domain matters.</MathText></p></Reveal></section></>
}
export default function MathsSite() {
  const params = new URLSearchParams(window.location.search)
  const topic = params.get('topic')
  const legacy = ['join','teacher','classroom','stage','code'].some(key=>params.has(key)) || /access_token|type=recovery|code=/.test(window.location.hash)
  const [page,setPage]=useState(0)
  useEffect(()=>{ if(topic!=='induction' && !legacy) {document.title=topic==='derivatives' ? 'Derivatives · Mr Jiang Maths' : 'Mr Jiang Maths';document.documentElement.lang='en'} },[topic,legacy])
  if(topic==='induction' || (!topic && legacy)) return <><a className="mj-return" href={siteUrl('')}>← Mr Jiang Maths</a><ClassroomRoot /></>
  if(topic==='derivatives') return <div className="mj-site"><div className="mj-topbar"><a className="mj-brand" href={siteUrl('')}>Mr Jiang<span>Maths</span></a><a href={siteUrl('induction')}>Mathematical induction ↗</a></div><main className="mj-lesson"><nav className="mj-tabs" aria-label="Derivative activities">{sections.map((name,i)=><button key={name} aria-current={i===page?'step':undefined} onClick={()=>{setPage(i);window.scrollTo(0,0)}}><span>0{i+1}</span><MathText>{name}</MathText></button>)}</nav>{[<ValueActivity />,<ConstantActivity />,<SelfDerivative />,<DomainActivity />].map((element,i)=><div key={i} hidden={i!==page}>{element}</div>)}<footer className="mj-footer"><button className="mj-button secondary" disabled={page===0} onClick={()=>{setPage(page-1);window.scrollTo(0,0)}}>← Back</button><span>{page+1} / 4</span><button className="mj-button" disabled={page===3} onClick={()=>{setPage(page+1);window.scrollTo(0,0)}}>Continue →</button></footer></main></div>
  return <div className="mj-site"><div className="mj-topbar"><a className="mj-brand" href={siteUrl('')}>Mr Jiang<span>Maths</span></a><span>Think it through.</span></div><main className="mj-home"><header><span className="mj-kicker">A PLACE TO ASK WHY</span><h1><MathText>Explore the idea.<br /><em>Explain the reasoning.</em></MathText></h1><p><MathText>Interactive mathematics with room to try, question and prove.</MathText></p></header><div className="mj-courses"><a className="mj-course induction" href={siteUrl('induction')}><span className="mj-course-number">01 / PROOF</span><div className="mj-disc-art" aria-hidden="true"><i /><i /><i /><i /></div><h2><MathText>Mathematical induction</MathText></h2><p><MathText>Move a tower. Build an argument. Understand how one case supports the next.</MathText></p><strong>Enter the induction lab <span>↗</span></strong></a><a className="mj-course derivatives" href={siteUrl('derivatives')}><span className="mj-course-number">02 / CALCULUS</span><div className="mj-equation-art" aria-hidden="true"><MathFormula tex={"f'=f"} /><span>What counts as an example?</span></div><h2><MathText>Functions & derivatives</MathText></h2><p><MathText>What does (2)′ mean? Can a function be its own derivative? How much does the domain matter?</MathText></p><strong>Explore derivatives <span>↗</span></strong></a></div><p className="mj-home-foot"><MathText>Start with a question. Reveal the explanation when you are ready.</MathText></p></main></div>
}
