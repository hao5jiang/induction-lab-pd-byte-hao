const ORIGIN = 'https://hao5jiang.github.io'
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2, '0')).join('')
const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), x => alphabet[x % alphabet.length]).join('')
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin')
    if (origin && origin !== ORIGIN) return json({ error: 'Origin is not allowed.' }, 403)
    const headers = { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Vary': 'Origin' }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    const url = new URL(request.url)
    let response
    if (url.pathname === '/create' && request.method === 'POST') {
      for (let i = 0; i < 12; i++) {
        const code = randomCode()
        const teacher = randomToken()
        const stub = env.CLASSROOMS.get(env.CLASSROOMS.idFromName(code))
        const result = await stub.fetch('https://classroom/internal-create', { method: 'POST', body: JSON.stringify({ code, teacher }) })
        if (result.status === 201) { response = json({ code, teacher }, 201); break }
      }
      response ??= json({ error: 'Could not create a class. Please retry.' }, 503)
    } else {
      const match = url.pathname.match(/^\/class\/([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6})\/(join|state|progress|dashboard|release|end)$/)
      if (!match) response = json({ error: 'Not found.' }, 404)
      else {
        const stub = env.CLASSROOMS.get(env.CLASSROOMS.idFromName(match[1]))
        response = await stub.fetch(new Request('https://classroom/' + match[2], request))
      }
    }
    const result = new Response(response.body, response)
    for (const [key, value] of Object.entries(headers)) result.headers.set(key, value)
    return result
  },
}

export class Classroom {
  constructor(state) {
    this.state = state
    this.queue = Promise.resolve()
  }
  async alarm() { await this.state.storage.deleteAll() }
  async fetch(request) {
    const route = new URL(request.url).pathname.slice(1)
    let body = {}
    if (request.method === 'POST') {
      try { body = await request.json() } catch { return json({ error: 'Invalid request.' }, 400) }
    }
    const task = this.queue.then(() => this.handle(route, request.method, request.headers.get('Authorization') || '', body))
    this.queue = task.catch(() => {})
    return task
  }
  async handle(route, method, authHeader, body) {
    const data = await this.state.storage.get('class')
    if (route === 'internal-create') {
      if (data && data.active && Date.now() - data.created <= 7 * 86400000) return json({ error: 'Code already used.' }, 409)
      await this.state.storage.put('class', { code: body.code, teacher: body.teacher, created: Date.now(), active: true, shortest: false, steps: false, participants: {} })
      await this.state.storage.setAlarm(Date.now() + 7 * 86400000)
      return json({ ok: true }, 201)
    }
    if (!data || !data.active || Date.now() - data.created > 7 * 86400000) return json({ error: 'Class not found or closed.' }, 404)
    const token = authHeader.replace(/^Bearer /, '')
    if (route === 'join' && method === 'POST') {
      const name = String(body.name || '').trim().slice(0, 40)
      if (!name) return json({ error: 'Enter a nickname.' }, 400)
      if (Object.keys(data.participants).length >= 120) return json({ error: 'Class is full.' }, 429)
      const participant = randomToken()
      const progress = { name, stage: 'play', disc_count: 3, move_count: 0, hint_count: 0, completed: false, notice_answer: null, prove_answer: null }
      data.participants[participant] = progress
      await this.state.storage.put('class', data)
      return json({ participant, progress, shortest: data.shortest, steps: data.steps }, 201)
    }
    const isTeacher = token && token === data.teacher
    const pupil = token && data.participants[token]
    if (route === 'state' && method === 'GET' && pupil) return json({ progress: pupil, shortest: data.shortest, steps: data.steps })
    if (route === 'dashboard' && method === 'GET' && isTeacher) return json({ code: data.code, shortest: data.shortest, steps: data.steps, participants: Object.values(data.participants) })
    if (route === 'release' && method === 'POST' && isTeacher) {
      if (body.gate === 'shortest') data.shortest = true
      else if (body.gate === 'steps' && data.shortest) data.steps = true
      else return json({ error: 'Invalid approval.' }, 400)
      await this.state.storage.put('class', data)
      return json({ ok: true })
    }
    if (route === 'end' && method === 'POST' && isTeacher) {
      await this.state.storage.deleteAll()
      return json({ ok: true })
    }
    if (route === 'progress' && method === 'POST' && pupil) {
      const stages = ['play', 'notice', 'prove', 'steps', 'debrief', 'can']
      const stage = String(body.stage || '')
      if (!stages.includes(stage)) return json({ error: 'Invalid stage.' }, 400)
      if (['prove', 'steps', 'debrief', 'can'].includes(stage) && (body.notice_answer !== 'possible' || !data.shortest)) return json({ error: 'First approval is required.' }, 403)
      if (['steps', 'debrief', 'can'].includes(stage) && (body.prove_answer !== 'all' || !data.steps)) return json({ error: 'Second approval is required.' }, 403)
      pupil.stage = stage
      for (const key of ['disc_count', 'move_count', 'hint_count']) pupil[key] = Math.max(0, Math.min(99999, Number.isFinite(body[key]) ? Math.floor(body[key]) : 0))
      pupil.completed = body.completed === true
      pupil.notice_answer = ['possible', 'minimum'].includes(body.notice_answer) ? body.notice_answer : null
      pupil.prove_answer = ['all', 'some'].includes(body.prove_answer) ? body.prove_answer : null
      await this.state.storage.put('class', data)
      return json({ ok: true })
    }
    return json({ error: 'Access denied.' }, 403)
  }
}
