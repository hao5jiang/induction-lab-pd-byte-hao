import { Children, cloneElement, isValidElement } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

export function MathFormula({ tex, display = false }) {
  const Tag = display ? 'div' : 'span'
  return <Tag className={display ? 'mj-typeset-display' : 'mj-typeset-inline'} dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { displayMode: display, throwOnError: true, trust: false, output: 'htmlAndMathml' }) }} />
}

export const expressions = {
  '(−∞, 0) ∪ (0, ∞)': String.raw`(-\infty,0)\cup(0,\infty)`,
  'f′(x) = f(x)': String.raw`f'(x)=f(x)`,
  'f′(x)': String.raw`f'(x)`,
  'F′(x)': String.raw`F'(x)`,
  'g′(a)': String.raw`g'(a)`,
  'g′': String.raw`g'`,
  'f′': String.raw`f'`,
  'F′': String.raw`F'`,
  'F′(x) = eˣ = F(x)': String.raw`F'(x)=e^x=F(x)`,
  'F′(x) = 2eˣ = F(x)': String.raw`F'(x)=2e^x=F(x)`,
  'e⁻ˣf(x) = C': String.raw`e^{-x}f(x)=C`,
  'f(x) = Ceˣ': String.raw`f(x)=Ce^x`,
  'g(x) = f(x)/eˣ': String.raw`g(x)=\frac{f(x)}{e^x}`,
  'g(x) = C': String.raw`g(x)=C`,
  'g(x)': String.raw`g(x)`,
  'f(x)': String.raw`f(x)`,
  'F(x)': String.raw`F(x)`,
  'g(0)': String.raw`g(0)`,
  'f(0)': String.raw`f(0)`,
  'F(0)': String.raw`F(0)`,
  'g′(x)': String.raw`g'(x)`,
  'g′ = 0': String.raw`g'=0`,
  'f(a) = y': String.raw`f(a)=y`,
  'C = y/eᵃ': String.raw`C=\frac{y}{e^a}`,
  'eˣ': String.raw`e^x`,
  'F(x) = Ceˣ': String.raw`F(x)=Ce^x`,
  'g′(x) = 2x': String.raw`g'(x)=2x`,
  'g′(2) = 4': String.raw`g'(2)=4`,
  'f′(2) = 0': String.raw`f'(2)=0`,
  'f′(a) = 0': String.raw`f'(a)=0`,
  'f(x) = 2': String.raw`f(x)=2`,
  'f(x) = 0': String.raw`f(x)=0`,
  'g(x) = x²': String.raw`g(x)=x^2`,
  'y = x²': String.raw`y=x^2`,
  'y = f(x)': String.raw`y=f(x)`,
  '(2)′ = 0': String.raw`(2)'=0`,
  '2 − 2 = 0': String.raw`2-2=0`,
  'x = a': 'x=a', 'x = 2': 'x=2', 'x = 0': 'x=0',
  'x < 0': 'x<0', 'x > 0': 'x>0', 'C = 0': 'C=0',
  'f′ = f': String.raw`f'=f`, 'F′ = F': String.raw`F'=F`,
  'f′(a)': String.raw`f'(a)`, 'g′(2)': String.raw`g'(2)`,
  'g(2)': 'g(2)', 'e⁻ˣf(x)': String.raw`e^{-x}f(x)`,
  'Ceˣ': String.raw`Ce^x`, '(2)′': String.raw`(2)'`,
}
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const bareSymbols = { f:'f', g:'g', F:'F', C:'C', x:'x', b:'b' }
const barePattern = String.raw`(?<![A-Za-z0-9])(?:f|g|F|C|x|b)(?![A-Za-z0-9′'])`
const matcher = new RegExp(`(${Object.keys(expressions).sort((a,b)=>b.length-a.length).map(escape).join('|')}|${barePattern})`, 'g')

export function MathText({ children }) {
  return Children.map(children, child => {
    if (typeof child === 'string') return child.split(matcher).map((part,index) => expressions[part] || bareSymbols[part] ? <MathFormula key={index} tex={expressions[part] || bareSymbols[part]} /> : part)
    if (isValidElement(child) && child.props.children && child.type !== MathFormula) return cloneElement(child, {}, <MathText>{child.props.children}</MathText>)
    return child
  })
}
