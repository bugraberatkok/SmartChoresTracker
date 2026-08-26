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
  date: string
  completed: boolean
  recurring: boolean
  backendId: number    // the real id from the API
}

const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const startOfWeek = new Date()
startOfWeek.setHours(0, 0, 0, 0)
startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7))

const week = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(startOfWeek)
  date.setDate(startOfWeek.getDate() + index)
  return {
    day: date.toLocaleDateString(undefined, { weekday: 'short' }),
    dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
    date: dateKey(date),
    dayNumber: date.getDate(),
    label: date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }),
  }
})

// Map a backend ChoreResponse to our UI Chore type
function toUIChore(c: ChoreResponse, occurrenceDate?: string): Chore {
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
    icon: c.icon || '🧹',
    date: occurrenceDate ?? dateKey(due),
    completed: c.recurring
      ? c.completedDates.includes(occurrenceDate ?? dateKey(due))
      : c.status === 'COMPLETED',
    recurring: c.recurring,
  }
}

function expandChoresForWeek(chores: ChoreResponse[]) {
  return chores.flatMap((chore) => {
    if (!chore.recurring) return [toUIChore(chore)]
    return week
      .filter((day) => chore.recurrenceDays.includes(day.dayOfWeek))
      .map((day) => toUIChore(chore, day.date))
  })
}

const trophies = [
  { icon: '🌱', name: 'First Step', detail: 'Complete your first chore', needed: 1 },
  { icon: '⭐', name: 'Rising Star', detail: 'Earn 50 total points', needed: 50 },
  { icon: '🏆', name: 'Chore Champion', detail: 'Earn 200 total points', needed: 200 },
]

const CHORE_ICONS = ['🧹', '🧽', '🧺', '🍽️', '🗑️', '🪴', '🐕', '🛏️', '🛒', '🚿']

type Props = { household: Household; member: Member; onBack: () => void }

export default function MemberDashboard({ household, member, onBack }: Props) {
  const today = dateKey(new Date())
  const [tab, setTab] = useState<Tab>('chores')
  const [selectedDate, setSelectedDate] = useState(today)
  const [chores, setChores] = useState<Chore[]>([])
  const [groupChores, setGroupChores] = useState<ChoreResponse[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  const [editingRecurring, setEditingRecurring] = useState(false)
  const [deletingChore, setDeletingChore] = useState<Chore | null>(null)
  const [actionError, setActionError] = useState('')
  const [points, setPoints] = useState(member.points)
  const [loadingChores, setLoadingChores] = useState(true)
  const [addError, setAddError] = useState('')
  const [recurring, setRecurring] = useState(false)

  // Fetch chores from API on mount
  useEffect(() => {
    let cancelled = false
    setLoadingChores(true)

    fetchGroupChores(household.id)
      .then((data) => {
        if (cancelled) return
        setGroupChores(data)
        const memberChores = data.filter((c) => c.assignedUserId === member.id)
        const uiChores = expandChoresForWeek(memberChores)
        setChores(uiChores)

        // Compute total points for this member
        const memberPoints = memberChores
          .reduce((sum, c) => sum + (c.points ?? 0) * (c.recurring ? c.completedDates.length : c.status === 'COMPLETED' ? 1 : 0), 0)
        setPoints(memberPoints)
      })
      .catch(() => { /* keep empty */ })
      .finally(() => { if (!cancelled) setLoadingChores(false) })

    return () => { cancelled = true }
  }, [household.id, member.id])

  const dailyChores = chores.filter((chore) => chore.date === selectedDate)
  const todaysChores = chores.filter((chore) => chore.date === today)
  const completedCount = dailyChores.filter((chore) => chore.completed).length

  const graphData = useMemo(() => {
    // Build real data from chores by day-of-week
    const counts: Record<string, number> = Object.fromEntries(week.map((day) => [day.date, 0]))
    chores.filter((chore) => chore.completed).forEach((chore) => { counts[chore.date] = (counts[chore.date] ?? 0) + 1 })
    const max = Math.max(...Object.values(counts), 1)
    return week.map((w) => ({
      day: w.day,
      count: counts[w.date],
      value: Math.round((counts[w.date] / max) * 100),
    }))
  }, [chores])

  const ranking = useMemo(() => {
    const totals = household.members.map((householdMember) => ({
      id: householdMember.id,
      name: householdMember.name,
      points: groupChores
        .filter((chore) => chore.assignedUserId === householdMember.id)
        .reduce((sum, chore) => sum + (chore.points ?? 0) * (chore.recurring ? chore.completedDates.length : chore.status === 'COMPLETED' ? 1 : 0), 0),
    })).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))

    return totals.map((entry) => ({
      ...entry,
      rank: 1 + totals.filter((other) => other.points > entry.points).length,
    }))
  }, [groupChores, household.members])

  const linePoints = graphData.map((item, index) =>
    `${30 + index * 106},${190 - item.value * 1.55}`,
  ).join(' ')

  const toggleChore = async (chore: Chore) => {
    if (!chore || chore.completed) return

    try {
      const updated = await completeChore(household.id, chore.backendId, chore.date)
      setGroupChores((current) => current.map((item) => item.id === updated.id ? updated : item))
      setChores((current) =>
        current.map((item) => item.id === chore.id && item.date === chore.date ? toUIChore(updated, chore.date) : item),
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
    const recurrenceDays = data.getAll('recurrenceDays').map(String)

    if (!title) {
      setActionError('Chore name is required')
      return
    }

    if (!Number.isFinite(points) || points < 0) {
      setActionError('Points must be a non-negative number')
      return
    }

    if (editingRecurring && recurrenceDays.length === 0) {
      setActionError('Choose at least one day for a recurring task')
      return
    }

    try {
      const updated = await updateChore(household.id, editingChore.backendId, {
        title,
        description,
        points,
        icon: String(data.get('icon') ?? editingChore.icon),
        recurring: editingRecurring,
        recurrenceDays,
      })
      setGroupChores((current) => current.map((item) => item.id === updated.id ? updated : item))
      setChores((current) => current.flatMap((item) => item.backendId === editingChore.backendId ? [] : [item]).concat(expandChoresForWeek([updated])))
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
      setGroupChores((current) => current.filter((item) => item.id !== deletingChore.backendId))
      setChores((current) => current.filter((item) => item.backendId !== deletingChore.backendId))
      const deletedRecord = groupChores.find((item) => item.id === deletingChore.backendId)
      if (deletedRecord) setPoints((value) => Math.max(0, value - (deletedRecord.points ?? 0) * (deletedRecord.recurring ? deletedRecord.completedDates.length : deletedRecord.status === 'COMPLETED' ? 1 : 0)))
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
    const timeStr = String(data.get('time'))
    const dueDate = new Date(`${selectedDate}T${timeStr}`)
    const recurrenceDays = data.getAll('recurrenceDays').map(String)

    if (recurring && recurrenceDays.length === 0) {
      setAddError('Choose at least one day for a recurring task')
      return
    }

    try {
      const created = await createChore(household.id, {
        title: String(data.get('title')),
        description: String(data.get('description') ?? ''),
        points: Number(data.get('points')),
        assignedUserId: member.id,
        dueDate: dueDate.toISOString(),
        icon: String(data.get('icon') ?? '🧹'),
        recurring,
        recurrenceDays,
      })

      setGroupChores((current) => [...current, created])
      setChores((current) => [...current, ...expandChoresForWeek([created])])
      setShowAdd(false)
      setRecurring(false)
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
            <div className="calendar-title"><div><strong>{selectedDate === today ? 'Today' : week.find((item) => item.date === selectedDate)?.day}, {week.find((item) => item.date === selectedDate)?.label}</strong><span>Select a day to view its chores</span></div><span className="calendar-icon">▦</span></div>
            <div className="week-days">{week.map((item) => <button key={item.date} className={selectedDate === item.date ? 'selected' : ''} onClick={() => setSelectedDate(item.date)}><small>{item.day}</small><strong>{item.dayNumber}</strong><i>{chores.some((chore) => chore.date === item.date) && '•'}</i></button>)}</div>
          </div>

          <div className="chores-heading"><div><span className="eyebrow">Any time</span><h2>Daily chores</h2></div>{household.isAdmin && <button className="add-chore-button" type="button" onClick={() => setShowAdd(true)}><span>+</span> Add chore</button>}</div>
          <div className="chore-list">
            {loadingChores && <p style={{ textAlign: 'center', opacity: 0.6, padding: '1rem' }}>Loading chores...</p>}
            {!loadingChores && dailyChores.length ? dailyChores.map((chore) => <article className={`chore-card ${chore.completed ? 'completed' : ''}`} key={`${chore.id}-${chore.date}`}>
              <button className="chore-check" type="button" onClick={() => toggleChore(chore)} disabled={chore.completed} aria-label={chore.completed ? `${chore.title} completed` : `Complete ${chore.title}`}>{chore.completed && '✓'}</button>
              <span className="chore-emoji">{chore.icon}</span>
              <div className="chore-info"><span>◷ {chore.time}</span><strong>{chore.title}</strong>{chore.description && <small>{chore.description}</small>}</div>
              {household.isAdmin && <div style={{ display: 'flex', gap: '0.35rem' }}><button type="button" onClick={() => { setActionError(''); setEditingRecurring(chore.recurring); setEditingChore(chore) }} title="Edit chore">✎</button><button type="button" onClick={() => { setActionError(''); setDeletingChore(chore) }} title="Delete chore">🗑</button></div>}
              <div className="chore-points"><strong>{chore.points}</strong><span>★</span></div>
            </article>) : !loadingChores && <div className="empty-state"><span>☀️</span><h3>No chores for this day</h3><p>Enjoy the free time or add a new chore.</p></div>}
          </div>
        </>}

        {tab === 'trophies' && <section className="tab-page"><div className="tab-page-heading"><span className="eyebrow">Badge cabinet</span><h2>Trophies</h2><p>Every completed chore gets you closer to a new achievement.</p></div><div className="trophy-grid">{trophies.map((trophy) => { const earned = trophy.name === 'First Step' ? chores.some((chore) => chore.completed) : points >= trophy.needed; return <article className={`trophy-card ${earned ? 'earned' : ''}`} key={trophy.name}><span>{trophy.icon}</span><small>{earned ? 'Earned' : `${Math.min(points, trophy.needed)} / ${trophy.needed} pts`}</small><h3>{trophy.name}</h3><p>{trophy.detail}</p>{earned && <i>✓</i>}</article> })}<article className={`trophy-card badges-card ${points >= 20 ? 'earned' : ''}`}><span>🎖️</span><small>{points % 20} / 20 pts to next</small><strong className="badge-count">{Math.floor(points / 20)}</strong><h3>Badges earned</h3><p>One badge earned for every 20 points.</p><div className="earned-badges">{Array.from({ length: Math.floor(points / 20) }, (_, index) => <span key={index} title={`Badge ${index + 1}`}>🏅</span>)}{points < 20 && <em>No badges yet</em>}</div></article></div></section>}

        {tab === 'progress' && <section className="tab-page"><div className="tab-page-heading"><span className="eyebrow">This week</span><h2>Progress</h2><p>See consistency, completed chores, and points earned over time.</p></div><div className="stats-row"><div><strong>{chores.filter((c) => c.completed).length}</strong><span>Chores completed</span></div><div><strong>{points}</strong><span>Total points</span></div><div><strong>{todaysChores.length}</strong><span>Today's chores</span></div></div><div className="progress-chart"><div className="chart-top"><strong>Weekly activity</strong><span>Chores completed</span></div><div className="line-chart"><svg viewBox="0 0 700 225" role="img" aria-label="Line graph of chores completed this week"><line x1="30" y1="35" x2="666" y2="35" /><line x1="30" y1="112" x2="666" y2="112" /><line x1="30" y1="190" x2="666" y2="190" /><polyline className="activity-line" points={linePoints} />{graphData.map((item, index) => <g key={item.day}><circle cx={30 + index * 106} cy={190 - item.value * 1.55} r="6" /><text className="graph-value" x={30 + index * 106} y={178 - item.value * 1.55}>{item.count}</text><text className="graph-day" x={30 + index * 106} y="216">{item.day}</text></g>)}</svg></div></div><div className="ranking-table"><div className="ranking-heading"><span>🏁</span><div><strong>Household ranking</strong><small>Ranked by total points</small></div></div>{ranking.map((entry) => <div className={`ranking-row ${entry.id === member.id ? 'current-member' : ''}`} key={entry.id}><strong>#{entry.rank}</strong><span>{entry.name}{entry.id === member.id && <small>You</small>}</span><b>{entry.points} pts</b></div>)}</div></section>}
      </section>

      {showAdd && household.isAdmin && <div className="modal-backdrop" onMouseDown={() => setShowAdd(false)}><section className="modal chore-modal" role="dialog" aria-modal="true" aria-labelledby="add-chore-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowAdd(false)}>×</button><span className="modal-icon">🧹</span><h2 id="add-chore-title">Add a chore</h2><p>Assign a new task to {member.name} for {week.find((day) => day.date === selectedDate)?.label}.</p><form onSubmit={addChore}><label>Choose an icon</label><div className="icon-picker">{CHORE_ICONS.map((icon, index) => <label key={icon}><input type="radio" name="icon" value={icon} defaultChecked={index === 0} /><span>{icon}</span></label>)}</div><label htmlFor="chore-title">Chore name</label><input className="modal-input" id="chore-title" name="title" placeholder="e.g. Water the plants" required /><label htmlFor="chore-description">Description</label><input className="modal-input" id="chore-description" name="description" placeholder="e.g. Clean the counter and wash the dishes" /><div className="modal-row"><div><label htmlFor="chore-time">Time</label><input className="modal-input" id="chore-time" name="time" type="time" required /></div><div><label htmlFor="chore-points">Points</label><input className="modal-input" id="chore-points" name="points" type="number" min="1" max="50" defaultValue="5" required /></div></div><label className="recurring-toggle"><input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} /> Recurring task</label>{recurring && <fieldset className="weekday-picker"><legend>Repeat on</legend>{week.map((day) => <label key={day.dayOfWeek}><input type="checkbox" name="recurrenceDays" value={day.dayOfWeek} /><span>{day.day.slice(0, 2)}</span></label>)}</fieldset>}{addError && <p className="form-message error-message" role="alert">{addError}</p>}<button className="submit-button" type="submit">Add chore <span>→</span></button></form></section></div>}

      {editingChore && household.isAdmin && (
        <div className="modal-backdrop" onMouseDown={() => setEditingChore(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-chore-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setEditingChore(null)}>×</button>
            <span className="modal-icon">✎</span>
            <h2 id="edit-chore-title">Edit chore</h2>
            <p>Update the task details for {member.name}.</p>
            <form onSubmit={submitEditChore}>
              <label>Choose an icon</label>
              <div className="icon-picker">{CHORE_ICONS.map((icon) => <label key={icon}><input type="radio" name="icon" value={icon} defaultChecked={icon === editingChore.icon} /><span>{icon}</span></label>)}</div>
              <label htmlFor="edit-chore-name">Chore name</label>
              <input className="modal-input" id="edit-chore-name" name="title" defaultValue={editingChore.title} required />
              <label htmlFor="edit-chore-description">Description</label>
              <input className="modal-input" id="edit-chore-description" name="description" defaultValue={editingChore.description} />
              <label htmlFor="edit-chore-points">Points</label>
              <input className="modal-input" id="edit-chore-points" name="points" type="number" min="0" max="50" defaultValue={editingChore.points} required />
              <label className="recurring-toggle"><input type="checkbox" checked={editingRecurring} onChange={(event) => setEditingRecurring(event.target.checked)} /> Recurring task</label>
              {editingRecurring && <fieldset className="weekday-picker"><legend>Repeat on</legend>{week.map((day) => <label key={day.dayOfWeek}><input type="checkbox" name="recurrenceDays" value={day.dayOfWeek} defaultChecked={groupChores.find((chore) => chore.id === editingChore.backendId)?.recurrenceDays.includes(day.dayOfWeek)} /><span>{day.day.slice(0, 2)}</span></label>)}</fieldset>}
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
