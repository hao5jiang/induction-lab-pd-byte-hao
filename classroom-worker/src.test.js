import test from 'node:test'
import assert from 'node:assert/strict'
import worker, { Classroom } from './src.js'

class Storage {
  constructor() { this.values = new Map() }
  async get(key) { return structuredClone(this.values.get(key)) }
  async put(key, value) { this.values.set(key, structuredClone(value)) }
  async setAlarm() {}
  async deleteAll() { this.values.clear() }
}
function environment() {
  const objects = new Map()
  return { CLASSROOMS: { idFromName: name => name, get(id) { if (!objects.has(id)) objects.set(id, new Classroom({ storage: new Storage() })); return { fetch: (...args) => objects.get(id).fetch(new Request(...args)) } } } }
}
async function request(env, path, body, token) {
  const response = await worker.fetch(new Request('https://worker.example' + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), env)
  return [response.status, await response.json()]
}
test('teacher and student capabilities stay separate and gates control progression', async () => {
  const env = environment()
  const [created, klass] = await request(env, '/create', {})
  assert.equal(created, 201)
  const base = '/class/' + klass.code
  const [joined, student] = await request(env, base + '/join', { name: 'Student' })
  assert.equal(joined, 201)
  assert.equal((await request(env, base + '/dashboard', null, student.participant))[0], 403)
  assert.equal((await request(env, base + '/release', { gate: 'steps' }, klass.teacher))[0], 400)
  const progress = { stage: 'steps', notice_answer: 'possible', prove_answer: 'all', disc_count: 3 }
  assert.equal((await request(env, base + '/progress', progress, student.participant))[0], 403)
  assert.equal((await request(env, base + '/release', { gate: 'shortest' }, klass.teacher))[0], 200)
  assert.equal((await request(env, base + '/progress', progress, student.participant))[0], 403)
  assert.equal((await request(env, base + '/release', { gate: 'steps' }, klass.teacher))[0], 200)
  assert.equal((await request(env, base + '/progress', progress, student.participant))[0], 200)
  const [, dashboard] = await request(env, base + '/dashboard', null, klass.teacher)
  assert.equal(dashboard.participants[0].stage, 'steps')
  assert.equal((await request(env, base + '/end', {}, klass.teacher))[0], 200)
  assert.equal((await request(env, base + '/state', null, student.participant))[0], 404)
})

test('concurrent delayed POST join and progress requests do not overwrite each other', async () => {
  const env = environment()
  const [created, klass] = await request(env, '/create', {})
  assert.equal(created, 201)
  const base = '/class/' + klass.code
  const [j1, s1] = await request(env, base + '/join', { name: 'First' })
  assert.equal(j1, 201)
  assert.equal(s1.progress.name, 'First')
  assert.equal(s1.shortest, false)
  assert.equal(s1.steps, false)

  const delayedPost = (path, body, token, delayMs) => {
    const encoded = new TextEncoder().encode(JSON.stringify(body))
    const stream = new ReadableStream({
      async start(controller) {
        await new Promise(r => setTimeout(r, delayMs))
        controller.enqueue(encoded)
        controller.close()
      },
    })
    const req = new Request('https://worker.example' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: stream,
      duplex: 'half',
    })
    return worker.fetch(req, env).then(async res => [res.status, await res.json()])
  }

  const [[pStatus], [j2Status, s2]] = await Promise.all([
    delayedPost(base + '/progress', { stage: 'play', disc_count: 3, move_count: 5, hint_count: 1, completed: false, notice_answer: null, prove_answer: null }, s1.participant, 25),
    delayedPost(base + '/join', { name: 'Second' }, null, 5),
  ])
  assert.equal(pStatus, 200)
  assert.equal(j2Status, 201)

  const [stateStatus, stateRes] = await request(env, base + '/state', null, s2.participant)
  assert.equal(stateStatus, 200)
  assert.equal(stateRes.progress.name, 'Second')

  const [, dashboard] = await request(env, base + '/dashboard', null, klass.teacher)
  assert.equal(dashboard.participants.length, 2)
  const first = dashboard.participants.find(p => p.name === 'First')
  assert.equal(first.move_count, 5)
})
