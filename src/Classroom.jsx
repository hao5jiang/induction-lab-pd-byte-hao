import { useCallback, useEffect, useRef, useState } from 'react'
import App from './App.jsx'

const API = import.meta.env.VITE_CLASSROOM_API?.replace(/\/$/, '')
const teacherKey = 'induction-teacher-class-v2'
const studentKey = 'induction-student-class-v2'
const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } }
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Session still works until the page is closed. */ } }
const remove = key => { try { localStorage.removeItem(key) } catch { /* No saved session. */ } }
async function call(path, { token, body } = {}) {
  if (!API) throw new Error('The classroom service is not configured yet.')
  const response = await fetch(`${API}${path}`, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Connection failed.')
  return result
}

export function StudentClass({ session, onLeave }) {
  const [initial, setInitial] = useState(null)
  const [state, setState] = useState(null)
  const [status, setStatus] = useState('loading')
  const [sync, setSync] = useState('connected')
  const pending = useRef(null)
  const running = useRef(false)
  const mounted = useRef(true)
  const path = `/class/${session.code}`
  const refresh = useCallback(async () => {
    try {
      const result = await call(`${path}/state`, { token: session.participant })
      if (!mounted.current) return
      setState(result); setInitial(value => value || result.progress); setStatus('ready')
    } catch { if (mounted.current) setStatus('error') }
  }, [path, session.participant])
  const flush = useCallback(async () => {
    if (running.current || !pending.current) return
    running.current = true
    try {
      while (pending.current) {
        const value = pending.current; pending.current = null
        try { await call(`${path}/progress`, { token: session.participant, body: value }) }
        catch { pending.current = pending.current || value; if (mounted.current) setSync('error'); break }
      }
      if (!pending.current && mounted.current) setSync('connected')
    } finally { running.current = false }
  }, [path, session.participant])
  const onProgress = useCallback(progress => { pending.current = progress; setSync('syncing'); void flush() }, [flush])
  useEffect(() => {
    mounted.current = true; void refresh()
    const timer = setInterval(() => { void refresh(); void flush() }, 5000)
    return () => { mounted.current = false; clearInterval(timer) }
  }, [refresh, flush])
  if (!initial) return <main className="mj-panel" style={{ maxWidth: '600px', margin: '40px auto' }}><p>{status === 'error' ? 'Could not connect to the class.' : 'Opening the class…'}</p><button className="mj-button" onClick={refresh}>Retry</button> <button className="mj-button secondary" onClick={onLeave}>Leave</button></main>
  return <App classroom={{ code: session.code, displayName: initial.name, syncState: status === 'error' ? 'error' : sync, gateStatus: status, workflowVersion: 2, releases: { shortest: !!state?.shortest, steps: !!state?.steps }, initialProgress: initial, initialProgressKey: session.participant }} onLeaveClass={onLeave} onProgress={onProgress} />
}

export function StudentJoinView({ defaultCode = '', onJoined = null }) {
  const [code, setCode] = useState(defaultCode.toUpperCase())
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [student, setStudent] = useState(() => {
    const saved = read(studentKey)
    return saved && (!defaultCode || saved.code === defaultCode.toUpperCase()) ? saved : null
  })

  async function join(event) {
    event.preventDefault()
    try {
      const cleanCode = code.trim().toUpperCase()
      const result = await call(`/class/${cleanCode}/join`, { body: { name: name.trim() } })
      const value = { code: cleanCode, participant: result.participant }
      save(studentKey, value)
      setStudent(value)
      setError('')
      if (onJoined) onJoined(value)
    } catch (e) {
      setError(e.message)
    }
  }

  if (student) {
    return <StudentClass session={student} onLeave={() => { remove(studentKey); setStudent(null) }} />
  }

  return (
    <div className="classroom-welcome" style={{ maxWidth: '480px', margin: '40px auto', background: '#fffdf7', padding: '32px', borderRadius: '8px', border: '1px solid #d5dcd2', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
      <h1 style={{ fontSize: '28px', margin: '0 0 10px', color: '#182d32' }}>加入课堂 · Join Class</h1>
      <p style={{ color: '#536868', fontSize: '15px', lineHeight: 1.6 }}>输入教师提供的 6 位课堂码及您的昵称，即可同步参与实时课堂练习。</p>
      {error && <p className="classroom-error" role="alert" style={{ color: '#c0392b', background: '#fdf2f0', padding: '10px', borderRadius: '4px', margin: '12px 0' }}>{error}</p>}
      <form onSubmit={join} style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
        <label style={{ display: 'grid', gap: '6px', fontWeight: 600, fontSize: '14px', color: '#182d32' }}>
          课堂码 (Class code)
          <input
            value={code}
            maxLength={6}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="6-digit code (e.g. AB12CD)"
            style={{ padding: '10px 12px', fontSize: '16px', border: '1px solid #a6b9ac', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: '6px', fontWeight: 600, fontSize: '14px', color: '#182d32' }}>
          昵称或座位号 (Nickname)
          <input
            value={name}
            maxLength={40}
            onChange={e => setName(e.target.value)}
            placeholder="Your name or seat number"
            style={{ padding: '10px 12px', fontSize: '16px', border: '1px solid #a6b9ac', borderRadius: '4px' }}
            required
          />
        </label>
        <button type="submit" className="mj-button" style={{ marginTop: '10px' }}>
          立即进入课堂 (Enter Classroom) →
        </button>
      </form>
    </div>
  )
}

export default function Classroom() {
  const params = new URLSearchParams(window.location.search)
  const initialMode = params.has('teacher') ? 'teacher' : params.has('join') ? 'join' : 'choose'
  const [mode, setMode] = useState(initialMode)
  const [code, setCode] = useState((params.get('join') || '').toUpperCase())
  const [name, setName] = useState('')
  const [teacher, setTeacher] = useState(() => read(teacherKey))
  const [student, setStudent] = useState(() => { const saved = read(studentKey); const requested = (params.get('join') || '').toUpperCase(); return saved && (!requested || saved.code === requested) ? saved : null })
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    if (!teacher) return
    try { setDashboard(await call(`/class/${teacher.code}/dashboard`, { token: teacher.teacher })); setError('') }
    catch (e) { setError(e.message) }
  }, [teacher])
  useEffect(() => { if (mode !== 'teacher' || !teacher) return; void refresh(); const timer = setInterval(refresh, 5000); return () => clearInterval(timer) }, [mode, teacher, refresh])
  async function create() {
    try { const result = await call('/create', { body: {} }); save(teacherKey, result); setTeacher(result); setError('') }
    catch (e) { setError(e.message) }
  }
  async function join(event) {
    event.preventDefault()
    try { const result = await call(`/class/${code.trim().toUpperCase()}/join`, { body: { name } }); const value = { code: code.trim().toUpperCase(), participant: result.participant }; save(studentKey, value); setStudent(value); setError('') }
    catch (e) { setError(e.message) }
  }
  async function action(actionName, body) {
    if (actionName === 'end' && !window.confirm('End this class and delete its student progress?')) return
    try { await call(`/class/${teacher.code}/${actionName}`, { token: teacher.teacher, body }); if (actionName === 'end') { remove(teacherKey); setTeacher(null); setDashboard(null) } else await refresh(); setError('') }
    catch (e) { setError(e.message) }
  }
  if (student && mode === 'join') return <StudentClass session={student} onLeave={() => { remove(studentKey); setStudent(null) }} />
  const link = teacher ? `${location.origin}${location.pathname}?join=${teacher.code}` : ''
  return <main className="classroom-page"><div className="classroom-welcome"><h1>Live classroom</h1><p>Students join with a nickname. The teacher controls the class on this device.</p>{error && <p className="classroom-error" role="alert">{error}</p>}
    {mode === 'choose' && <div><button onClick={() => setMode('teacher')}>Teacher dashboard</button> <button onClick={() => setMode('join')}>Join a class</button> <a href="?topic=induction&role=teacher">Standalone activity</a></div>}
    {mode === 'join' && <form onSubmit={join}><label>Class code <input value={code} maxLength={6} onChange={e => setCode(e.target.value.toUpperCase())} required /></label><label>Nickname <input value={name} maxLength={40} onChange={e => setName(e.target.value)} required /></label><button type="submit">Join class</button></form>}
    {mode === 'teacher' && !teacher && <div><p>Keep this browser available: its private key controls the class. Classes expire after seven days.</p><button onClick={create}>Create class</button> <button onClick={() => setMode('choose')}>Back</button></div>}
    {mode === 'teacher' && teacher && <div><h2>Class code: {teacher.code}</h2><p>Student link: <a href={link}>{link}</a></p><button onClick={() => navigator.clipboard.writeText(link).catch(() => setError('Copy the link shown above.'))}>Copy student link</button> <button disabled={!dashboard || dashboard.shortest} onClick={() => action('release', { gate: 'shortest' })}>Approve: MORE DISCS?</button> <button disabled={!dashboard?.shortest || dashboard?.steps} onClick={() => action('release', { gate: 'steps' })}>Approve: STEPS</button> <button onClick={() => action('end', {})}>End class</button><h2>Student progress</h2>{dashboard ? <table><thead><tr><th>Nickname</th><th>Stage</th><th>Discs</th><th>Moves</th><th>NOTICE</th><th>SHORTEST?</th></tr></thead><tbody>{dashboard.participants.map((p, i) => <tr key={i}><td>{p.name}</td><td>{p.stage}</td><td>{p.disc_count}</td><td>{p.move_count}</td><td>{p.notice_answer || '—'}</td><td>{p.prove_answer || '—'}</td></tr>)}</tbody></table> : <p>Loading…</p>}</div>}
  </div></main>
}
