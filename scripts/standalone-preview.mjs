import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.argv[2]
if (!root) throw new Error('Preview directory is required')
const main = path.join(root, 'src', 'main.jsx')
let entry = await readFile(main, 'utf8')
if (entry.includes("import ClassroomRoot from './ClassroomRoot.jsx'")) {
  entry = entry.replace("import ClassroomRoot from './ClassroomRoot.jsx'", "import App from './App.jsx'").replace('<ClassroomRoot />', '<App />')
  await writeFile(main, entry)
} else {
  const site = path.join(root, 'src', 'MathsSite.jsx')
  let source = await readFile(site, 'utf8')
  if (!source.includes("import ClassroomRoot from './ClassroomRoot.jsx'")) throw new Error('Unexpected preview entry')
  source = source.replace("import ClassroomRoot from './ClassroomRoot.jsx'", "import App from './App.jsx'").replace('<ClassroomRoot />', '<App />')
  await writeFile(site, source)
}
