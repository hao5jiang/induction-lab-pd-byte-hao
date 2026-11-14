import { useCallback, useEffect, useRef, useState } from 'react'
import App from './App.jsx'

const API = import.meta.env.VITE_CLASSROOM_API?.replace(/\/$/, '')
const teacherKey = 'induction-teacher-class-v2'
const studentKey = 'induction-student-class-v2'
const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } }
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Session still works until the page is closed. */ } }
const remove = key => { try { localStorage.removeItem(key) } catch { /* No saved session. */ } }
function cleanClassCode(raw) {
  const upper = String(raw || '').toUpperCase().trim()
  const paramMatch = upper.match(/[?&](?:JOIN|CODE)=([A-Z0-9]{6})/)
  if (paramMatch) return paramMatch[1]
  return upper.replace(/[^A-Z0-9]/g, '').slice(0, 6)
}
async function call(path, { token, body } = {}) {
  if (!API) throw new Error('The classroom service is not configured yet.')
  const response = await fetch(`${API}${path}`, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const result = await response.json()
  if (!response.ok) {
    const error = new Error(result.error || 'Connection failed.')
    error.status = response.status
    throw error
  }
  return result
}

export function StudentClass({ session, onLeave }) {
  const [initial, setInitial] = useState(() => session.progress || (session.name ? {
    name: session.name, stage: 'play', disc_count: 3, move_count: 0, hint_count: 0,
    completed: false, notice_answer: null, prove_answer: null,
  } : null))
  const [state, setState] = useState(() => session.shortest !== undefined ? { shortest: !!session.shortest, steps: !!session.steps } : null)
  const [status, setStatus] = useState(() => session.progress ? 'ready' : 'loading')
  const [sync, setSync] = useState('connected')
  const tokenRef = useRef(session.participant)
  const lastProgressRef = useRef(null)
  const rejoinRef = useRef(null)
  const pending = useRef(null)
  const running = useRef(false)
  const mounted = useRef(true)
  const path = `/class/${session.code}`

  useEffect(() => { tokenRef.current = session.participant }, [session.participant])

  const rejoin = useCallback(async () => {
    if (rejoinRef.current) return rejoinRef.current
    const studentName = (session.name || initial?.name || 'Student').trim() || 'Student'
    rejoinRef.current = (async () => {
      const result = await call(`${path}/join`, { body: { name: studentName } })
      tokenRef.current = result.participant
      save(studentKey, { code: session.code, participant: result.participant, name: studentName })
      if (lastProgressRef.current) pending.current = lastProgressRef.current
      return result
    })().finally(() => { rejoinRef.current = null })
    return rejoinRef.current
  }, [path, session.code, session.name, initial?.name])

  const refresh = useCallback(async () => {
    try {
      const result = await call(`${path}/state`, { token: tokenRef.current })
      if (!mounted.current) return
      setState(result); setInitial(value => value || result.progress); setStatus('ready')
    } catch (e) {
      if (!mounted.current) return
      if (e.status === 404 || e.message === 'Class not found or closed.') {
        onLeave('Class not found or closed. Please check the class code.'); return
      }
      if (e.status === 403) {
        try {
          await rejoin()
          const retry = await call(`${path}/state`, { token: tokenRef.current })
          if (!mounted.current) return
          setState(retry); setInitial(value => value || retry.progress); setStatus('ready')
          return
        } catch (err) {
          if (!mounted.current) return
          if (err.status === 404 || err.message === 'Class not found or closed.') {
            onLeave('Class not found or closed. Please check the class code.'); return
          }
        }
      }
      setStatus('error')
    }
  }, [path, onLeave, rejoin])

  const flush = useCallback(async () => {
    if (running.current || !pending.current) return
    running.current = true
    try {
      while (pending.current) {
        const value = pending.current; pending.current = null
        try {
          await call(`${path}/progress`, { token: tokenRef.current, body: value })
        } catch (e) {
          if (e.status === 404 || e.message === 'Class not found or closed.') {
            if (mounted.current) onLeave('Class not found or closed. Please check the class code.')
            return
          }
          if (e.status === 403 && !/approval is required/i.test(e.message)) {
            try {
              await rejoin()
              await call(`${path}/progress`, { token: tokenRef.current, body: value })
              continue
            } catch (err) {
              if (err.status === 404 || err.message === 'Class not found or closed.') {
                if (mounted.current) onLeave('Class not found or closed. Please check the class code.')
                return
              }
            }
          }
          pending.current = pending.current || value; if (mounted.current) setSync('error'); break
        }
      }
      if (!pending.current && mounted.current) setSync('connected')
    } finally { running.current = false }
  }, [path, onLeave, rejoin])

  const onProgress = useCallback(progress => {
    lastProgressRef.current = progress
    pending.current = progress
    setSync('syncing')
    void flush()
  }, [flush])

  useEffect(() => {
    mounted.current = true; void refresh()
    const timer = setInterval(() => { void refresh(); void flush() }, 5000)
    return () => { mounted.current = false; clearInterval(timer) }
  }, [refresh, flush])

  if (!initial) {
    return (
      <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '24px', background: 'linear-gradient(135deg, #04111d, #071724)', color: '#f2eadc' }}>
        <div style={{ width: 'min(100%, 480px)', padding: '28px', borderRadius: '14px', border: '1px solid rgba(214, 224, 232, 0.24)', background: '#0a2030', boxShadow: '0 22px 60px rgba(0, 0, 0, 0.34)' }}>
          <p style={{ margin: '0 0 18px', fontSize: '16px', lineHeight: 1.6 }}>{status === 'error' ? 'Could not connect to the class.' : 'Opening the class…'}</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" className="classroom-primary" onClick={refresh}>Retry</button>
            <button type="button" className="classroom-secondary" onClick={() => onLeave('')}>Leave</button>
          </div>
        </div>
      </main>
    )
  }
  return <App classroom={{ code: session.code, displayName: initial.name, syncState: status === 'error' ? 'error' : sync, gateStatus: status, workflowVersion: 2, releases: { shortest: !!state?.shortest, steps: !!state?.steps }, initialProgress: initial, initialProgressKey: session.participant }} onLeaveClass={() => onLeave('')} onProgress={onProgress} />
}

export function StudentJoinView({ defaultCode = '', backHref = null, onJoined = null }) {
  const [code, setCode] = useState(() => cleanClassCode(defaultCode))
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [student, setStudent] = useState(() => {
    const saved = read(studentKey)
    const cleanedDefault = cleanClassCode(defaultCode)
    return saved && (!cleanedDefault || saved.code === cleanedDefault) ? saved : null
  })

  async function join(event) {
    event.preventDefault()
    if (joining) return
    const cleanCode = cleanClassCode(code)
    const cleanName = name.trim()
    if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(cleanCode)) {
      setError('Please enter a valid 6-character class code. / 请输入有效的 6 位课堂码。')
      return
    }
    if (!cleanName) {
      setError('Please enter your nickname or seat number. / 请输入昵称或座位号。')
      return
    }
    setJoining(true)
    setError('')
    try {
      const result = await call(`/class/${cleanCode}/join`, { body: { name: cleanName } })
      const stored = { code: cleanCode, participant: result.participant, name: cleanName }
      save(studentKey, stored)
      setStudent({
        ...stored,
        ...(result.progress ? { progress: result.progress, shortest: result.shortest, steps: result.steps } : {}),
      })
      if (onJoined) onJoined(stored)
    } catch (e) {
      setError(e.message)
    } finally {
      setJoining(false)
    }
  }

  if (student) {
    return (
      <StudentClass
        session={student}
        onLeave={(msg = '') => {
          remove(studentKey)
          setStudent(null)
          if (msg) setError(msg)
        }}
      />
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at 68% 42%, rgba(31, 68, 91, 0.23), transparent 38%), linear-gradient(135deg, #04111d, #071724)', color: '#f2eadc' }}>
      <header className="classroom-header">
        <span className="brand" style={{ fontSize: '20px', fontWeight: 700, color: '#f2eadc' }}>Mr Jiang Maths</span>
        {backHref && <a href={backHref} className="classroom-link" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>← 返回首页 (Home)</a>}
      </header>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '24px' }}>
        <div style={{ width: 'min(100%, 460px)', background: 'linear-gradient(145deg, rgba(15, 43, 62, 0.92), rgba(7, 25, 38, 0.88))', padding: '32px', borderRadius: '14px', border: '1px solid rgba(214, 224, 232, 0.28)', borderTop: '3px solid #48a7df', boxShadow: '0 22px 60px rgba(0, 0, 0, 0.34)' }}>
          <span className="classroom-kicker" style={{ display: 'block', marginBottom: '10px' }}>LIVE CLASSROOM · 汉诺塔实验</span>
          <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '30px', fontWeight: 400, margin: '0 0 10px', color: '#f2eadc' }}>加入课堂 · Join Class</h1>
          <p style={{ color: '#b9bdc3', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px' }}>输入教师提供的 6 位课堂码及您的昵称，即可同步参与实时课堂练习。</p>
          {error && <p className="classroom-error" role="alert" style={{ marginBottom: '16px' }}>{error}</p>}
          <form onSubmit={join} style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'grid', gap: '8px', fontWeight: 600, fontSize: '13px', color: '#d8dce0' }}>
              课堂码 (Class code)
              <input
                value={code}
                onChange={e => setCode(cleanClassCode(e.target.value))}
                placeholder="AB12CD"
                autoComplete="off"
                style={{ width: '100%', minHeight: '48px', padding: '10px 13px', fontSize: '20px', fontFamily: 'Georgia, "Times New Roman", serif', border: '1px solid #485e70', borderRadius: '7px', background: '#071a29', color: '#dff4ff', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}
                required
              />
            </label>
            <label style={{ display: 'grid', gap: '8px', fontWeight: 600, fontSize: '13px', color: '#d8dce0' }}>
              昵称或座位号 (Nickname)
              <input
                value={name}
                maxLength={40}
                onChange={e => setName(e.target.value)}
                placeholder="Your name or seat number"
                style={{ width: '100%', minHeight: '48px', padding: '10px 13px', fontSize: '16px', border: '1px solid #485e70', borderRadius: '7px', background: '#071a29', color: '#f2eadc' }}
                required
              />
            </label>
            <button type="submit" disabled={joining} className="classroom-primary" style={{ marginTop: '6px', width: '100%' }}>
              {joining ? '正在加入… (Joining…)' : '立即进入课堂 (Enter Classroom) →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function Classroom() {
  const params = new URLSearchParams(window.location.search)
  const initialMode = params.has('teacher') ? 'teacher' : params.has('join') ? 'join' : 'choose'
  const [mode, setMode] = useState(initialMode)
  const [code, setCode] = useState(() => cleanClassCode(params.get('join') || ''))
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [teacher, setTeacher] = useState(() => read(teacherKey))
  const [student, setStudent] = useState(() => {
    const saved = read(studentKey)
    const requested = cleanClassCode(params.get('join') || '')
    return saved && (!requested || saved.code === requested) ? saved : null
  })
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    if (!teacher) return
    try { setDashboard(await call(`/class/${teacher.code}/dashboard`, { token: teacher.teacher })); setError('') }
    catch (e) {
      if (e.status === 404 || e.status === 403 || e.message === 'Class not found or closed.') {
        remove(teacherKey)
        setTeacher(null)
        setDashboard(null)
        setError('')
        return
      }
      setError(e.message)
    }
  }, [teacher])
  useEffect(() => { if (mode !== 'teacher' || !teacher) return; void refresh(); const timer = setInterval(refresh, 5000); return () => clearInterval(timer) }, [mode, teacher, refresh])
  async function create() {
    try { const result = await call('/create', { body: {} }); save(teacherKey, result); setTeacher(result); setError('') }
    catch (e) { setError(e.message) }
  }
  async function join(event) {
    event.preventDefault()
    if (joining) return
    const cleanCode = cleanClassCode(code)
    const cleanName = name.trim()
    if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(cleanCode)) {
      setError('Please enter a valid 6-character class code.')
      return
    }
    if (!cleanName) {
      setError('Please enter a nickname.')
      return
    }
    setJoining(true)
    setError('')
    try {
      const result = await call(`/class/${cleanCode}/join`, { body: { name: cleanName } })
      const stored = { code: cleanCode, participant: result.participant, name: cleanName }
      save(studentKey, stored)
      setStudent({
        ...stored,
        ...(result.progress ? { progress: result.progress, shortest: result.shortest, steps: result.steps } : {}),
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setJoining(false)
    }
  }
  async function action(actionName, body) {
    if (actionName === 'end' && !window.confirm('End this class and delete its student progress?')) return
    try {
      await call(`/class/${teacher.code}/${actionName}`, { token: teacher.teacher, body })
      if (actionName === 'end') { remove(teacherKey); setTeacher(null); setDashboard(null) }
      else await refresh()
      setError('')
    } catch (e) {
      if (actionName === 'end' || e.status === 404 || e.status === 403 || e.message === 'Class not found or closed.') {
        remove(teacherKey)
        setTeacher(null)
        setDashboard(null)
        setError('')
        return
      }
      setError(e.message)
    }
  }
  if (student && mode === 'join') {
    return (
      <StudentClass
        session={student}
        onLeave={(msg = '') => {
          remove(studentKey)
          setStudent(null)
          if (msg) setError(msg)
        }}
      />
    )
  }
  const link = teacher ? `${location.origin}${location.pathname}?join=${teacher.code}` : ''
  return <main className="classroom-page"><div className="classroom-welcome"><h1>Live classroom</h1><p>Students join with a nickname. The teacher controls the class on this device.</p>{error && <p className="classroom-error" role="alert">{error}</p>}
    {mode === 'choose' && <div><button onClick={() => setMode('teacher')}>Teacher dashboard</button> <button onClick={() => setMode('join')}>Join a class</button> <a href="?topic=induction&role=teacher">Standalone activity</a></div>}
    {mode === 'join' && <form onSubmit={join}><label>Class code <input value={code} onChange={e => setCode(cleanClassCode(e.target.value))} required /></label><label>Nickname <input value={name} maxLength={40} onChange={e => setName(e.target.value)} required /></label><button type="submit" disabled={joining}>{joining ? 'Joining…' : 'Join class'}</button></form>}
    {mode === 'teacher' && !teacher && <div><p>Keep this browser available: its private key controls the class. Classes expire after seven days.</p><button onClick={create}>Create class</button> <button onClick={() => setMode('choose')}>Back</button></div>}
    {mode === 'teacher' && teacher && <div><h2>Class code: {teacher.code}</h2><p>Student link: <a href={link}>{link}</a></p><button onClick={() => navigator.clipboard.writeText(link).catch(() => setError('Copy the link shown above.'))}>Copy student link</button> <button disabled={!dashboard || dashboard.shortest} onClick={() => action('release', { gate: 'shortest' })}>Approve: MORE DISCS?</button> <button disabled={!dashboard?.shortest || dashboard?.steps} onClick={() => action('release', { gate: 'steps' })}>Approve: STEPS</button> <button onClick={() => action('end', {})}>End class</button><h2>Student progress</h2>{dashboard ? <table><thead><tr><th>Nickname</th><th>Stage</th><th>Discs</th><th>Moves</th><th>NOTICE</th><th>SHORTEST?</th></tr></thead><tbody>{dashboard.participants.map((p, i) => <tr key={i}><td>{p.name}</td><td>{p.stage}</td><td>{p.disc_count}</td><td>{p.move_count}</td><td>{p.notice_answer || '—'}</td><td>{p.prove_answer || '—'}</td></tr>)}</tbody></table> : <p>Loading…</p>}</div>}
  </div></main>
}
