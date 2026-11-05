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
