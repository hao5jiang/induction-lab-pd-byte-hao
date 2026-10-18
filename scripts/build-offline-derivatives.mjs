import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')
const indexPath = path.join(dist, 'index.html')
let html = await readFile(indexPath, 'utf8')

const scriptTag = html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/)
const styleTag = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/)
if (!scriptTag || !styleTag) throw new Error('Could not find the built script and stylesheet.')

const resolveAsset = url => {
  const assetPath = url.match(/(?:^|\/)assets\/[^?#]+$/)?.[0]
  if (!assetPath) throw new Error(`Unexpected build asset: ${url}`)
  return path.join(dist, assetPath.replace(/^\//, ''))
}
const script = await readFile(resolveAsset(scriptTag[1]), 'utf8')
const cssPath = resolveAsset(styleTag[1])
let css = await readFile(cssPath, 'utf8')

const fontUrls = [...css.matchAll(/url\(([^)]+)\)/g)]
for (const match of fontUrls) {
  const url = match[1].trim().replace(/^['"]|['"]$/g, '')
  if (url.startsWith('data:')) continue
  const fontPath = url.startsWith('/') ? resolveAsset(url) : path.resolve(path.dirname(cssPath), url)
  const font = await readFile(fontPath)
  const extension = path.extname(fontPath).slice(1)
  const mime = extension === 'woff2' ? 'font/woff2' : extension === 'woff' ? 'font/woff' : 'font/ttf'
  css = css.replace(match[0], `url(data:${mime};base64,${font.toString('base64')})`)
}
if (/url\((?!data:)/.test(css)) throw new Error('The offline stylesheet still references an external asset.')

html = html.replace(styleTag[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`)
html = html.replace(scriptTag[0], () => `<script>window.__MR_JIANG_OFFLINE_DERIVATIVES__ = true</script>\n<script type="module">${script.replace(/<\/script/gi, '<\\/script')}</script>`)
html = html.replace('<title>Mr Jiang Maths</title>', '<title>Derivatives · Mr Jiang Maths · Offline</title>')

for (const output of [
  path.join(root, 'offline', 'derivatives-student.html'),
  path.join(dist, 'downloads', 'derivatives-student.html'),
]) {
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, html)
  console.log(`Wrote ${output}`)
}
