import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { HomeMark } from './LoginPage'
import type { Household, Member } from './types'
import { fetchGroupChores, createChore, completeChore, updateChore, deleteChore, ApiError, type ChoreResponse } from './api'

type Tab = 'chores' | 'trophies' | 'progress'

type Chore = {
  id: number
  title: string
  description: string
  time: string
  points: number
  icon: string
  date: number
  completed: boolean
  backendId: number    // the real id from the API
}

// Map a backend ChoreResponse to our UI Chore type
function toUIChore(c: ChoreResponse): Chore {
  const due = c.dueDate ? new Date(c.dueDate) : new Date(c.createdAt)
  const hours = String(due.getHours()).padStart(2, '0')
  const minutes = String(due.getMinutes()).padStart(2, '0')

  return {
    id: c.id,
    backendId: c.id,
    title: c.title,
    description: c.description ?? '',
    time: `${hours}:${minutes}`,
    points: c.points ?? 0,
    icon: '🧹',   // backend doesn't have icons
    date: due.getDate(),
    completed: c.status === 'COMPLETED',
  }
}

const week = [
  { day: 'Mon', date: 17 }, { day: 'Tue', date: 18 }, { day: 'Wed', date: 19 },
  { day: 'Thu', date: 20 }, { day: 'Fri', date: 21 }, { day: 'Sat', date: 22 }, { day: 'Sun', date: 23 },
]

const trophies = [
  { icon: '🌱', name: 'First Step', detail: 'Complete your first chore', needed: 1 },
  { icon: '⭐', name: 'Rising Star', detail: 'Earn 50 total points', needed: 50 },
  { icon: '🔥', name: 'On a Roll', detail: 'Complete 5 chores in a row', needed: 100 },
  { icon: '🏆', name: 'Chore Champion', detail: 'Earn 200 total points', needed: 200 },
]

type Props = { household: Household; member: Member; onBack: () => void }

export default function MemberDashboard({ household, member, onBack }: Props) {
  const today = new Date().getDate()
  const [tab, setTab] = useState<Tab>('chores')
  const [selectedDate, setSelectedDate] = useState(today)
  const [chores, setChores] = useState<Chore[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  const [deletingChore, setDeletingChore] = useState<Chore | null>(null)
  const [actionError, setActionError] = useState('')
  const [points, setPoints] = useState(member.points)
  const [loadingChores, setLoadingChores] = useState(true)
  const [addError, setAddError] = useState('')

  // Fetch chores from API on mount
  useEffect(() => {
    let cancelled = false
    setLoadingChores(true)

    fetchGroupChores(household.id)
      .then((data) => {
        if (cancelled) return
        const memberChores = data.filter((c) => c.assignedUserId === member.id)
        const uiChores = memberChores.map(toUIChore)
        setChores(uiChores)

        // Compute total points for this member
        const memberPoints = memberChores
          .filter((c) => c.status === 'COMPLETED')
          .reduce((sum, c) => sum + (c.points ?? 0), 0)
        setPoints(memberPoints)
      })
      .catch(() => { /* keep empty */ })
      .finally(() => { if (!cancelled) setLoadingChores(false) })

    return () => { cancelled = true }
  }, [household.id, member.id])

  const dailyChores = chores.filter((chore) => chore.date === selectedDate)
  const completedCount = dailyChores.filter((chore) => chore.completed).length

  const graphData = useMemo(() => {
    // Build real data from chores by day-of-week
    const counts: Record<string, number> = {}
    week.forEach((w) => { counts[w.day] = 0 })
    chores.forEach((c) => {
      const w = week.find((item) => item.date === c.date)
      if (w && c.completed) counts[w.day] = (counts[w.day] || 0) + 1
    })
    const max = Math.max(...Object.values(counts), 1)
    return week.map((w) => ({
      day: w.day,
      value: Math.round((counts[w.day] / max) * 100),
    }))
  }, [chores])

  const toggleChore = async (id: number) => {
    const chore = chores.find((item) => item.id === id)
    if (!chore || chore.completed) return

    try {
      const updated = await completeChore(household.id, chore.backendId)
      setChores((current) =>
        current.map((item) => item.id === id ? toUIChore(updated) : item),
      )
      setPoints((value) => value + (updated.points ?? 0))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to complete chore')
    }
  }

  const submitEditChore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingChore) return

    setActionError('')
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title')).trim()
    const description = String(data.get('description') ?? '').trim()
    const points = Number(data.get('points'))

    if (!title) {
      setActionError('Chore name is required')
      return
    }

    if (!Number.isFinite(points) || points < 0) {
      setActionError('Points must be a non-negative number')
      return
    }

    try {
      const updated = await updateChore(household.id, editingChore.backendId, {
        title,
        description,
        points,
      })
      setChores((current) =>
        current.map((item) => item.id === editingChore.id ? toUIChore(updated) : item),
      )
      setEditingChore(null)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update chore')
    }
  }

  const confirmDeleteChore = async () => {
    if (!deletingChore) return

    setActionError('')
    try {
      await deleteChore(household.id, deletingChore.backendId)
      setChores((current) => current.filter((item) => item.id !== deletingChore.id))
      if (deletingChore.completed) {
        setPoints((value) => Math.max(0, value - deletingChore.points))
      }
      setDeletingChore(null)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to delete chore')
    }
  }

  const addChore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAddError('')
    const data = new FormData(event.currentTarget)

    // Build a due date from the selected calendar date + time
    const now = new Date()
    const timeStr = String(data.get('time'))
    const [hours, minutes] = timeStr.split(':').map(Number)
    const dueDate = new Date(now.getFullYear(), now.getMonth(), selectedDate, hours, minutes)

    try {
      const created = await createChore(household.id, {
        title: String(data.get('title')),
        description: String(data.get('description') ?? ''),
        points: Number(data.get('points')),
        assignedUserId: member.id,
        dueDate: dueDate.toISOString(),
      })

      setChores((current) => [...current, toUIChore(created)])
      setShowAdd(false)
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Failed to add chore')
    }
  }

  return (
    <main className="app-shell member-dashboard">
      <header className="app-header dashboard-header">
        <div className="brand"><span className="brand-mark"><HomeMark /></span><span>Smart Chores</span></div>
        <div className="household-chip"><span>{household.emoji}</span>{household.name}</div>
      </header>

      <section className="dashboard-content">
        <button className="back-button" type="button" onClick={onBack}>← All members</button>
        <div className="member-hero">
          <div className="dashboard-person"><span className="dashboard-avatar" style={{ background: member.color }}>{member.initials}</span><div><span className="eyebrow">Daily dashboard</span><h1>{member.name}</h1><p>{completedCount} of {dailyChores.length} chores complete today</p></div></div>
          <div className="dashboard-score"><span>★</span><div><strong>{points}</strong><small>points earned</small></div></div>
        </div>

        <nav className="dashboard-tabs" aria-label="Member dashboard">
          <button className={tab === 'chores' ? 'active' : ''} onClick={() => setTab('chores')}><span>✓</span> Chores</button>
          <button className={tab === 'trophies' ? 'active' : ''} onClick={() => setTab('trophies')}><span>♕</span> Trophies</button>
          <button className={tab === 'progress' ? 'active' : ''} onClick={() => setTab('progress')}><span>↗</span> Progress</button>
        </nav>

        {tab === 'chores' && <>
          <div className="week-calendar">
            <div className="calendar-title"><div><strong>{selectedDate === today ? 'Today' : week.find((item) => item.date === selectedDate)?.day}, August {selectedDate}</strong><span>Select a day to view its chores</span></div><span className="calendar-icon">▦</span></div>
            <div className="week-days">{week.map((item) => <button key={item.date} className={selectedDate === item.date ? 'selected' : ''} onClick={() => setSelectedDate(item.date)}><small>{item.day}</small><strong>{item.date}</strong><i>{chores.some((chore) => chore.date === item.date) && '•'}</i></button>)}</div>
          </div>

          <div className="chores-heading"><div><span className="eyebrow">Any time</span><h2>Daily chores</h2></div>{household.isAdmin && <button className="add-chore-button" type="button" onClick={() => setShowAdd(true)}><span>+</span> Add chore</button>}</div>
          <div className="chore-list">
            {loadingChores && <p style={{ textAlign: 'center', opacity: 0.6, padding: '1rem' }}>Loading chores...</p>}
            {!loadingChores && dailyChores.length ? dailyChores.map((chore) => <article className={`chore-card ${chore.completed ? 'completed' : ''}`} key={chore.id}>
              <button className="chore-check" type="button" onClick={() => toggleChore(chore.id)} disabled={chore.completed} aria-label={chore.completed ? `${chore.title} completed` : `Complete ${chore.title}`}>{chore.completed && '✓'}</button>
              <span className="chore-emoji">{chore.icon}</span>
              <div className="chore-info"><span>◷ {chore.time}</span><strong>{chore.title}</strong>{chore.description && <small>{chore.description}</small>}</div>
              {household.isAdmin && <div style={{ display: 'flex', gap: '0.35rem' }}><button type="button" onClick={() => { setActionError(''); setEditingChore(chore) }} title="Edit chore">✎</button><button type="button" onClick={() => { setActionError(''); setDeletingChore(chore) }} title="Delete chore">🗑</button></div>}
              <div className="chore-points"><strong>{chore.points}</strong><span>★</span></div>
            </article>) : !loadingChores && <div className="empty-state"><span>☀️</span><h3>No chores for this day</h3><p>Enjoy the free time or add a new chore.</p></div>}
          </div>
        </>}

        {tab === 'trophies' && <section className="tab-page"><div className="tab-page-heading"><span className="eyebrow">Badge cabinet</span><h2>Trophies</h2><p>Every completed chore gets you closer to a new achievement.</p></div><div className="trophy-grid">{trophies.map((trophy) => { const earned = points >= trophy.needed; return <article className={`trophy-card ${earned ? 'earned' : ''}`} key={trophy.name}><span>{trophy.icon}</span><small>{earned ? 'Earned' : `${Math.min(points, trophy.needed)} / ${trophy.needed} pts`}</small><h3>{trophy.name}</h3><p>{trophy.detail}</p>{earned && <i>✓</i>}</article> })}</div></section>}

        {tab === 'progress' && <section className="tab-page"><div className="tab-page-heading"><span className="eyebrow">This week</span><h2>Progress</h2><p>See consistency, completed chores, and points earned over time.</p></div><div className="stats-row"><div><strong>{chores.filter((c) => c.completed).length}</strong><span>Chores completed</span></div><div><strong>{points}</strong><span>Total points</span></div><div><strong>{dailyChores.length}</strong><span>Today's chores</span></div></div><div className="progress-chart"><div className="chart-top"><strong>Weekly activity</strong><span>Chores completed</span></div><div className="bars">{graphData.map((item) => <div className="bar-column" key={item.day}><div className="bar-track"><span style={{ height: `${item.value}%` }} /></div><small>{item.day}</small></div>)}</div></div></section>}
      </section>

      {showAdd && household.isAdmin && <div className="modal-backdrop" onMouseDown={() => setShowAdd(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-chore-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowAdd(false)}>×</button><span className="modal-icon">🧹</span><h2 id="add-chore-title">Add a chore</h2><p>Assign a new task to {member.name} for August {selectedDate}.</p><form onSubmit={addChore}><label htmlFor="chore-title">Chore name</label><input className="modal-input" id="chore-title" name="title" placeholder="e.g. Water the plants" required /><label htmlFor="chore-description">Description</label><input className="modal-input" id="chore-description" name="description" placeholder="e.g. Clean the counter and wash the dishes" /><div className="modal-row"><div><label htmlFor="chore-time">Time</label><input className="modal-input" id="chore-time" name="time" type="time" required /></div><div><label htmlFor="chore-points">Points</label><input className="modal-input" id="chore-points" name="points" type="number" min="1" max="50" defaultValue="5" required /></div></div>{addError && <p className="form-message error-message" role="alert">{addError}</p>}<button className="submit-button" type="submit">Add chore <span>→</span></button></form></section></div>}

      {editingChore && household.isAdmin && (
        <div className="modal-backdrop" onMouseDown={() => setEditingChore(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-chore-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setEditingChore(null)}>×</button>
            <span className="modal-icon">✎</span>
            <h2 id="edit-chore-title">Edit chore</h2>
            <p>Update the task details for {member.name}.</p>
            <form onSubmit={submitEditChore}>
              <label htmlFor="edit-chore-name">Chore name</label>
              <input className="modal-input" id="edit-chore-name" name="title" defaultValue={editingChore.title} required />
              <label htmlFor="edit-chore-description">Description</label>
              <input className="modal-input" id="edit-chore-description" name="description" defaultValue={editingChore.description} />
              <label htmlFor="edit-chore-points">Points</label>
              <input className="modal-input" id="edit-chore-points" name="points" type="number" min="0" max="50" defaultValue={editingChore.points} required />
              {actionError && <p className="form-message error-message" role="alert">{actionError}</p>}
              <button className="submit-button" type="submit">Save changes <span>→</span></button>
            </form>
          </section>
        </div>
      )}

      {deletingChore && household.isAdmin && (
        <div className="modal-backdrop" onMouseDown={() => setDeletingChore(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-chore-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setDeletingChore(null)}>×</button>
            <span className="modal-icon">🗑</span>
            <h2 id="delete-chore-title">Delete chore?</h2>
            <p><strong>{deletingChore.title}</strong> will be permanently deleted.</p>
            {actionError && <p className="form-message error-message" role="alert">{actionError}</p>}
            <div className="modal-row">
              <button className="back-button" type="button" onClick={() => setDeletingChore(null)}>Cancel</button>
              <button className="submit-button" type="button" onClick={confirmDeleteChore}>Delete chore</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
