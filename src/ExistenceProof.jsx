import { useState } from 'react'
import { useLanguage } from './Language.jsx'
import { existenceCopy } from './existenceCopy.js'
import { MiniTower } from './Tower.jsx'
import { MathFormula, MathProse } from './MathText.jsx'

export function ExistenceProof() {
  const language = useLanguage()
  const copy = existenceCopy[language]
  const [aidsHidden, setAidsHidden] = useState(false)
  const [highlightProof] = useState(() => new URLSearchParams(window.location.search).get('highlight') === 'existence-proof')
  return <section className="existence-proof" aria-labelledby="existence-title">
    <h1 id="existence-title">{copy.title}</h1>
    <p>{copy.intro}</p>
    <div className="existence-guiding-questions">
      {language === 'zh' ? <>
        <p>已会搬 <strong><MathFormula tex="2" /> 个盘</strong>，怎样借此搬 <strong><MathFormula tex="2+1" /> 个盘</strong>？<br />已会搬 <strong><MathFormula tex="3" /> 个盘</strong>，怎样借此搬 <strong><MathFormula tex="3+1" /> 个盘</strong>？</p>
        <p>这两次的做法有什么相同之处？</p>
        <p className="existence-general-question"><MathProse>对于每个盘数 n，只要已会搬 n 个盘，就能借此搬 n+1 个盘吗？</MathProse></p>
      </> : <><p>{copy.lead}</p><p className="existence-general-question">{copy.leadQuestion}</p></>}
    </div>
    <div id="existence-aids" hidden={aidsHidden}>
    <figure className="existence-start-tower">
      <MiniTower count={6} stage="start" />
      <div className="shortest-peg-labels" aria-hidden="true"><span>A</span><span>B</span><span>C</span></div>
      <figcaption>{copy.startDiagramCaption}</figcaption>
    </figure>
    <details id="existence-proof-entry" className={highlightProof ? 'existence-proof-highlight' : undefined}>
      <summary>{copy.reveal}</summary>
      <div className="shortest-diagrams existence-diagrams">
        {['clear', 'largest', 'rebuild'].map((stage, index) => <div key={stage}>
          <div className="stage-title"><span><MathFormula tex={String(index + 1)} /></span><p><MathProse>{copy.diagramCaptions[index]}</MathProse></p></div>
          <MiniTower count={5} stage={stage} />
          <div className="shortest-peg-labels" aria-hidden="true"><span>A</span><span>B</span><span>C</span></div>
        </div>)}
      </div>
      <div className="existence-fitch-scope">
        <h3 className="existence-assumption-title">{copy.stepTitle}</h3>
        <div className="existence-fitch-inner">
          <p><strong className="existence-logic-marker">{copy.assumptionLead}</strong><MathProse>{copy.assumptionBody}</MathProse></p>
          <p><MathProse>{copy.extension}</MathProse></p>
          <ol>{copy.steps.map((step, index) => <li key={index}><MathProse>{step}</MathProse></li>)}</ol>
          <aside className="existence-method-note"><strong>{copy.methodFreedom}</strong></aside>
          <p className="existence-fitch-result"><strong className="existence-logic-marker">{copy.constructionLead}</strong>{copy.constructionResult}</p>
        </div>
        <p><strong className="existence-logic-marker">{copy.specificLead}</strong>{copy.specificImplication}</p>
      </div>
      <h3 className="existence-implication">{copy.implication}</h3>
      <p>{copy.start}</p>
      <p className="existence-conclusion">{copy.conclusionLead}{copy.conclusion}</p>
    </details>
    </div>
    <section className="existence-explain" aria-labelledby="existence-explain-title">
      <h3 id="existence-explain-title">{copy.explainTitle}</h3>
      <p>{copy.explainTask}</p>
      <button type="button" className="answer-confirm" aria-controls="existence-aids" aria-expanded={!aidsHidden} onClick={() => setAidsHidden(!aidsHidden)}>
        {aidsHidden ? copy.restoreAids : copy.hideAids}
      </button>
      <p>{copy.explainSupport}</p>
    </section>
    <p className="reasoning-pending">{copy.next}</p>
  </section>
}
