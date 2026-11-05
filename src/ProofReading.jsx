import { Fragment, useEffect, useState } from 'react'
import { useLanguage, t } from './Language.jsx'
import { proofCopy } from './proofCopy.js'
import { appendixCopy } from './appendixCopy.js'
import { shortestCopy } from './shortestCopy.js'
import { ArrowIcon } from './icons.jsx'
import { MiniTower } from './Tower.jsx'
import { MathFormula } from './MathText.jsx'

function Sum() {
  return <MathFormula tex={String.raw`1 + 2 + \cdots + 2^{n-1}`} />
}

function DiscCountText({ value }) {
  return value.split(/(\[\[(?:[TG](?:1|n|next)|counts|nextCounts)\]\])/).map((part, index) => {
    if (part === '[[counts]]' || part === '[[nextCounts]]') {
      const terms = part === '[[counts]]' ? ['1,', '2,', '2^2,', String.raw`\ldots,`, '2^{n-1}'] : ['1,', String.raw`2\cdot1,`, String.raw`2\cdot2,`, String.raw`2\cdot2^2,`, String.raw`\cdots,`, String.raw`2\cdot2^{n-1}`]
      return <strong key={index}>{terms.map((tex, i) => <span className="proof-term" key={i}><MathFormula tex={tex} />{i < terms.length - 1 ? ' ' : ''}</span>)}</strong>
    }
    const match = part.match(/^\[\[([TG])(1|n|next)\]\]$/)
    if (match) return <span key={index} className="proof-term"><MathFormula tex={`${match[1]}_{${match[2] === 'next' ? 'n+1' : match[2]}}`} /></span>
    return <Fragment key={index}>{part.split(/((?<![A-Za-z0-9])(?:n\s*[+−-]\s*\d+|n|\d+(?:\.\d+)?)(?![A-Za-z0-9]))/g).map((piece, i) => /^(?:n\s*[+−-]\s*\d+|n|\d+(?:\.\d+)?)$/.test(piece) ? <MathFormula key={i} tex={piece.replace('−', '-')} /> : piece)}</Fragment>
  })
}

export function LowerBoundLadder({ compact = false }) {
  const locale = useLanguage()
  const copy = proofCopy[locale].lower
  const activity = shortestCopy[locale]
  return <section className={`reasoning-growth reasoning-ladder${compact ? ' is-compact' : ''}`}>
    <h2>{activity.practiceTitle}</h2>
    <p className="reasoning-start">{copy.start}</p>
    {activity.practice.map((item, i) => <article className="reasoning-disc-question" key={i}>
      <h3>{item.title}</h3><p>{item.prompt}</p>
      <details><summary>{activity.answerLabel}</summary>
        {item.reasons.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        <p className="reasoning-disc-count">{item.count}</p>
      </details>
    </article>)}
  </section>
}

export function MinimumProofScreen({ teacherLens, onBack, onNext, onOpenExistence }) {
  const locale = useLanguage()
  const common = proofCopy[locale]
  const copy = common.lower
  const routeCopy = appendixCopy[locale]
  const [routeFlash, setRouteFlash] = useState(0)
  const [recalling, setRecalling] = useState(false)
  const [highlightAttainment] = useState(() => new URLSearchParams(window.location.search).get('highlight') === 'attain-bound')
  useEffect(() => {
    if (!highlightAttainment) return
    const url = new URL(window.location.href)
    url.searchParams.delete('highlight')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }, [highlightAttainment])
  const existenceUrl = new URL(window.location.href)
  existenceUrl.searchParams.set('stage', 'existence')
  existenceUrl.searchParams.set('highlight', 'existence-proof')
  const renderAttainment = (value) => value.split(/(\[\[existence\]\]|\[\[existenceContrast\]\]|\[\[sameMethod\]\]|\[\[routeMethod\]\])/).map((part, index) => {
    if (part === '[[sameMethod]]') return <strong key={index} className="same-method-emphasis">{locale === 'zh' ? '同样的搬法' : 'the same method'}</strong>
    if (part === '[[routeMethod]]') return <a key={index} className="appendix-page-link" href="#attainment-route" onClick={(event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      document.getElementById('attainment-route')?.scrollIntoView({ block: 'start' })
      setRouteFlash(value => value + 1)
    }}>{locale === 'zh' ? '这套搬法' : 'this method'}</a>
    if (part === '[[existence]]' || part === '[[existenceContrast]]') return <a key={index} className="appendix-page-link" href={`${existenceUrl.pathname}${existenceUrl.search}`} onClick={(event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      const targetUrl = new URL(window.location.href)
      targetUrl.searchParams.set('highlight', 'existence-proof')
      window.history.replaceState(null, '', `${targetUrl.pathname}${targetUrl.search}`)
      onOpenExistence()
    }}>{part === '[[existenceContrast]]' ? (locale === 'zh' ? '第三页的存在性证明' : 'the existence proof on page three') : (locale === 'zh' ? '“继续加盘，也一定能搬完吗？”' : '“Can we always finish as we add more discs?”')}</a>
    return <DiscCountText key={index} value={part} />
  })
  return <section className="sequence-screen sequence-proof-screen reasoning-page reasoning-lower">
    <header className="sequence-heading"><span className="sequence-eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.intro}</p></header>
    <button className="sequence-button reasoning-toggle" type="button" aria-expanded={!recalling} aria-controls="reasoning-lower" onClick={() => setRecalling(!recalling)}>{recalling ? common.show : common.hide}</button>
    <details className="reasoning-visual-help">
      <summary>{common.visualHelp}</summary>
      <div className="reasoning-reference">{common.visualCaptions.map((caption, i) => <figure key={i}><MiniTower count={5} stage={['clear', 'largest', 'rebuild'][i]} /><div className="reasoning-peg-labels" aria-hidden="true"><span>A</span><span>B</span><span>C</span></div><figcaption>{caption}</figcaption></figure>)}</div>
    </details>
    <div id="reasoning-lower" hidden={recalling}>
        <details className="reasoning-connection"><summary>{copy.connect}</summary>
          <div className="reasoning-fitch-outer">
            <p><DiscCountText value={copy.let} /></p>
            <div className="reasoning-fitch-inner">
              <p><strong className="reasoning-fitch-assume">{copy.assumeLead}{copy.assumeColon}</strong> <DiscCountText value={copy.assumption} /></p>
              {copy.lowerSteps.map((step, index) => <p key={index}><DiscCountText value={step} /></p>)}
              <p>{locale === 'zh' ? <>这样，搬完 <MathFormula tex="n+1" /> 个盘时，<br />每个盘从大到小分别至少要移动 <DiscCountText value="[[nextCounts]]" /> 次。</> : <DiscCountText value={copy.innerConclusion} />}</p>
            </div>
            <div className="reasoning-fitch-result">
              <p><DiscCountText value={locale === 'zh' ? '所以，对于这个 n，如果搬完 n 个盘时，从大到小，每个盘最少需要移动的步数分别不低于：' : 'So, for this n, if moving n discs requires at least the following numbers of moves for the discs from largest to smallest:'} /></p>
              <div className="proof-count-formula">{['1,', '2,', '2^{2},', String.raw`\ldots,`, '2^{n-1}'].map((tex, index) => <MathFormula key={index} tex={String.raw`\displaystyle ` + tex} />)}</div>
              <p><DiscCountText value={locale === 'zh' ? '那么搬完 n+1 个盘时，从大到小，每个盘最少需要移动的步数分别不低于：' : 'then moving n + 1 discs requires at least the following numbers of moves for the discs from largest to smallest:'} /></p>
              <div className="proof-count-formula">{['1,', '2^{0+1},', '2^{1+1},', '2^{2+1},', String.raw`\ldots,`, '2^{n+1-1}'].map((tex, index) => <MathFormula key={index} tex={String.raw`\displaystyle ` + tex} />)}</div>
            </div>
          </div>
          <p><DiscCountText value={copy.lowerBase} /></p>
          <p className="reasoning-fitch-universal"><DiscCountText value={copy.general} /></p>
          <div className="sequence-sum"><Sum /></div>
          <p>{locale === 'zh' ? <>把<strong className="attainment-term">这个步数下界</strong>记作 <strong className="attainment-term"><MathFormula tex="T_n" /></strong>。</> : <>Call <strong className="attainment-term">this move lower bound</strong> <strong className="attainment-term"><MathFormula tex="T_n" /></strong>. </>}<DiscCountText value={copy.boundName.slice(copy.boundName.indexOf('[[Tn]]') + '[[Tn]]'.length).replace(/^[。.]\s*/, '')} /></p>
          <div className="sequence-sum"><MathFormula tex={String.raw`T_n = 1 + 2 + \cdots + 2^{n-1}`} /></div>
        </details>
        <details id="attain-bound" className={`reasoning-connection${highlightAttainment ? ' is-highlighted' : ''}`}><summary>{copy.attainTitle}</summary>
          <p>{renderAttainment(locale === 'zh' ? '设 n 是一个正整数。在[[existence]]中，我们已经证明 n 个盘能搬完。' : 'Let n be a positive integer. On [[existence]], we proved that n discs can be moved.')}</p>
          <section id="attainment-route" key={routeFlash} style={{ scrollMarginTop: '150px', animation: routeFlash ? 'proof-entry-flash 1.5s ease-out' : undefined }}>
            <h3>{locale === 'zh' ? '现在给出一种搬法' : 'Now describe a method'}</h3>
            <p>{routeCopy.routeIntro}</p>
            <ol>{routeCopy.routeSteps.map(step => <li key={step}>{step}</li>)}</ol>
          </section>
          <p>{locale === 'zh' ? <>按这套搬法完成搬运，<strong className="attainment-term">搬完 <MathFormula tex="n" /> 个盘所用的步数</strong>记作 <strong className="attainment-term"><MathFormula tex="G_n" /></strong>。</> : <>Denote <strong className="attainment-term">the number of moves this method uses to move <MathFormula tex="n" /> discs</strong> by <strong className="attainment-term"><MathFormula tex="G_n" /></strong>.</>}</p>
          <p>{renderAttainment(copy.attainRecurrence)}</p>
          <p className="reasoning-fitch-universal"><DiscCountText value={copy.attainGeneral} /></p>
          <div className="sequence-final-result"><strong>{copy.doneTitle}</strong><p><DiscCountText value={copy.done} /></p><div className="sequence-sum"><MathFormula tex={String.raw`T_n = G_n = 1 + 2 + \cdots + 2^{n-1}`} /></div></div>
        </details>
    </div>
    {teacherLens && <aside className="sequence-teacher-cue" aria-label={t('Teacher lens')}><strong>{t('TEACHER LENS')}</strong><p>{copy.teacher}</p></aside>}
    <footer className="sequence-footer">
      <button className="sequence-button" type="button" onClick={onBack}><ArrowIcon direction="left" />{common.back}</button>
      <button className="sequence-button is-primary" type="button" onClick={onNext}>{locale === 'zh' ? '查看附录' : 'Open the appendix'}<ArrowIcon /></button>
    </footer>
  </section>
}

function LinkedFourthText({ value, href, label, onOpen }) {
  return value.split('[[shortest]]').map((part, index) => <Fragment key={index}>{index > 0 && <a className="appendix-page-link" href={href} onClick={onOpen}>{label}</a>}{part}</Fragment>)
}

export function AppendixProofScreen({ onBack, onNext, onOpenQuestion }) {
  const copy = appendixCopy[useLanguage()]
  const fourthUrl = new URL(window.location.href)
  fourthUrl.searchParams.set('stage', 'prove')
  const fourthHref = `${fourthUrl.pathname}${fourthUrl.search}`
  const openFourth = (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onOpenQuestion()
  }
  return <section className="sequence-screen sequence-proof-screen reasoning-page reasoning-appendix">
    <header className="sequence-heading"><span className="sequence-eyebrow">{copy.eyebrow}</span><h1><a className="appendix-page-link" href={fourthHref} onClick={openFourth}>{copy.title}</a></h1><p><LinkedFourthText value={copy.intro} href={fourthHref} label={copy.shortestPageLabel} onOpen={openFourth} /></p></header>
    <aside className="appendix-alternative">
      <h2>{copy.alternativeTitle}</h2>
      <p>{copy.alternativeText}</p>
    </aside>
    <section className="appendix-route">
      <h2>{copy.routeTitle}</h2>
      <p>{copy.routeIntro}</p>
      <ol>{copy.routeSteps.map((step) => <li key={step}>{step}</li>)}</ol>
    </section>
    <h2 className="appendix-proof-label">{copy.proofLabel}</h2>
    <p className="appendix-base">{copy.base}</p>
    <div className="reasoning-fitch-outer">
      <h2><DiscCountText value={copy.let} /></h2>
      <div className="reasoning-fitch-inner">
        <p><strong className="reasoning-fitch-assume">{copy.assumptionLead}</strong> {copy.assumption}</p>
        <p>{copy.extension}</p>
        <ol>{copy.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p><strong className="reasoning-fitch-assume">{copy.resultLead}</strong><LinkedFourthText value={copy.result} href={fourthHref} label={copy.shortestPageLabel} onOpen={openFourth} /></p>
      </div>
      <p className="reasoning-fitch-result"><strong>{copy.implicationLead}</strong>{copy.implication}</p>
    </div>
    <p className="appendix-conclusion"><LinkedFourthText value={copy.conclusion} href={fourthHref} label={copy.shortestPageLabel} onOpen={openFourth} /><span className="appendix-qed" aria-label={copy.proofEnd}>□</span></p>
    <footer className="sequence-footer">
      <button className="sequence-button" type="button" onClick={onBack}><ArrowIcon direction="left" />{copy.back}</button>
      <button className="sequence-button is-primary" type="button" onClick={onNext}>{t('APPENDIX 2')}<ArrowIcon /></button>
    </footer>
  </section>
}
