import {
  useEffect,
  useMemo,
  useState } from 'react'
import type { FormEvent } from 'react'
import { HomeMark } from './LoginPage'
import type { Household,
  Member } from './types'
import { avatarEmoji } from './types'
import {
  fetchGroupChores,
  createChore,
  completeChore,
  uncompleteChore,
  updateChore,
  deleteChore,
  fetchLeaderboard,
  ApiError,
  type ChoreResponse,
  type LeaderboardEntryResponse,
  fetchAchievements,
  type AchievementResponse,
  fetchWeeklyProgress,
  type ProgressDayResponse,
  fetchStreak,
  type StreakResponse,
  fetchRewards,
  fetchRewardBalance,
  createReward,
  redeemReward,
  deactivateReward,
  type RewardResponse,
  type RewardBalanceResponse,
} from './api'

type Tab = 'chores' | 'trophies' | 'rewards' | 'progress'

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
  householdId: number
  householdName?: string
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
function toUIChore(c: ChoreResponse, occurrenceDate?: string, householdName?: string): Chore {
  const due = c.dueDate ? new Date(c.dueDate) : new Date(c.createdAt)
  const hours = String(due.getHours()).padStart(2, '0')
  const minutes = String(due.getMinutes()).padStart(2, '0')

  return {
    id: c.id,
    backendId: c.id,
    householdId: c.groupId,
    householdName,
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

function expandChoresForWeek(chores: ChoreResponse[], householdNames: Map<number, string> = new Map()) {
  return chores.flatMap((chore) => {
    if (!chore.recurring) return [toUIChore(chore, undefined, householdNames.get(chore.groupId))]

    return week
        .filter((day) =>
            chore.recurrenceDays.includes(day.dayOfWeek) &&
            (!chore.recurrenceStartDate || day.date >= chore.recurrenceStartDate)
        )
        .map((day) => toUIChore(chore, day.date, householdNames.get(chore.groupId)))
  })
}


const CHORE_ICONS = ['🧹', '🧽', '🧺', '🍽️', '🗑️', '🪴', '🐕', '🛏️', '🛒', '🚿']

type DashboardReward = RewardResponse & {
  householdId: number
  householdName: string
  householdBalance: number
  canManage: boolean
}

type Props = {
  household: Household
  member: Member
  personalProfileView?: boolean
  profileHouseholds?: Household[]
  currentUserId: number | null
  onHome: () => void
  onBack: () => void
}

export default function MemberDashboard({
  household,
  member,
  personalProfileView = false,
  profileHouseholds = [],
  currentUserId,
  onHome,
  onBack,
}: Props) {
  const dataHouseholds = useMemo(
    () => personalProfileView ? profileHouseholds : [household],
    [personalProfileView, profileHouseholds, household],
  )
  const householdNames = useMemo(
    () => new Map(dataHouseholds.map((item) => [item.id, item.name])),
    [dataHouseholds],
  )
  const canCreateForDashboard = household.isAdmin || member.id === currentUserId
  const today = dateKey(new Date())
  const [tab, setTab] = useState<Tab>('chores')
  const [selectedDate, setSelectedDate] = useState(today)
  const [chores, setChores] = useState<Chore[]>([])
  const [groupChores, setGroupChores] = useState<ChoreResponse[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryResponse[]>([])
  const [achievements, setAchievements] = useState<AchievementResponse[]>([])
  const [progressData, setProgressData] = useState<ProgressDayResponse[]>([])
  const [rewards, setRewards] = useState<DashboardReward[]>([])
  const [rewardBalance, setRewardBalance] = useState<RewardBalanceResponse | null>(null)
  const [rewardLoading, setRewardLoading] = useState(true)
  const [rewardError, setRewardError] = useState('')
  const [showRewardForm, setShowRewardForm] = useState(false)
  const [redeemingRewardId, setRedeemingRewardId] = useState<number | null>(null)
  const [deletingReward, setDeletingReward] = useState<DashboardReward | null>(null)
  const [streak, setStreak] = useState<StreakResponse | null>(null)
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

    Promise.all(dataHouseholds.map((item) => fetchGroupChores(item.id)))
      .then((responses) => {
        if (cancelled) return
        const data = responses.flat()
        setGroupChores(data)
        const memberChores = data.filter((c) => c.assignedUserId === member.id)
        const uiChores = expandChoresForWeek(memberChores, householdNames)
        setChores(uiChores)

        // Compute total points for this member
        const memberPoints = memberChores
          .reduce((sum, c) => sum + (c.points ?? 0) * (c.recurring ? c.completedDates.length : c.status === 'COMPLETED' ? 1 : 0), 0)
        setPoints(memberPoints)
      })
      .catch(() => { /* keep empty */ })
      .finally(() => { if (!cancelled) setLoadingChores(false) })

    return () => { cancelled = true }
  }, [dataHouseholds, householdNames, member.id])

  useEffect(() => {
    let cancelled = false

    if (personalProfileView) {
      return
    }

    fetchLeaderboard(household.id)
      .then((data) => {
        if (!cancelled) {
          setLeaderboard(data)
        }
      })
      .catch(() => {
        // keep empty
      })

    return () => {
      cancelled = true
    }
  }, [household.id, personalProfileView])

  useEffect(() => {
    let cancelled = false

    Promise.all(dataHouseholds.map((item) => fetchAchievements(item.id, member.id)))
      .then((responses) => {
        if (!cancelled) {
          const templates = responses[0] ?? []
          setAchievements(templates.map((template) => {
            const values = responses.map((items) => items.find((item) => item.code === template.code)?.currentValue ?? 0)
            const currentValue = template.code.includes('STREAK') ? Math.max(...values, 0) : values.reduce((sum, value) => sum + value, 0)
            return { ...template, currentValue, earned: currentValue >= template.requiredValue }
          }))
        }
      })
      .catch(() => {
        // keep empty
      })

    return () => {
      cancelled = true
    }
  }, [dataHouseholds, member.id])

  const dailyChores = chores.filter((chore) => chore.date === selectedDate)
  const todaysChores = chores.filter((chore) => chore.date === today)
  const completedCount = dailyChores.filter((chore) => chore.completed).length

  useEffect(() => {
    let cancelled = false

    Promise.all(dataHouseholds.map((item) => fetchStreak(item.id, member.id)))
      .then((responses) => {
        if (!cancelled) {
          setStreak({
            currentStreak: Math.max(...responses.map((item) => item.currentStreak), 0),
            longestStreak: Math.max(...responses.map((item) => item.longestStreak), 0),
            lastActiveDate: responses.map((item) => item.lastActiveDate).filter((date): date is string => Boolean(date)).sort().at(-1) ?? null,
          })
        }
      })
      .catch(() => {
        // keep empty
      })

    return () => {
      cancelled = true
    }
  }, [dataHouseholds, member.id])

  useEffect(() => {
    let cancelled = false

    Promise.all(dataHouseholds.map((item) => fetchWeeklyProgress(item.id, member.id)))
      .then((responses) => {
        if (!cancelled) {
          const totals = new Map<string, ProgressDayResponse>()
          responses.flat().forEach((item) => {
            const existing = totals.get(item.date)
            totals.set(item.date, { ...item, completedChores: (existing?.completedChores ?? 0) + item.completedChores })
          })
          setProgressData([...totals.values()])
        }
      })
      .catch(() => {
        // keep empty
      })

    return () => {
      cancelled = true
    }
  }, [dataHouseholds, member.id])

  useEffect(() => {
    let cancelled = false


    Promise.all(dataHouseholds.map(async (item) => {
      const [rewardData, balanceData] = await Promise.all([
        fetchRewards(item.id),
        fetchRewardBalance(item.id),
      ])
      return { item, rewardData, balanceData }
    }))
      .then((responses) => {
        if (cancelled) return
        setRewards(responses.flatMap(({ item, rewardData, balanceData }) => rewardData.map((reward) => ({
          ...reward,
          householdId: item.id,
          householdName: item.name,
          householdBalance: balanceData.availablePoints,
          canManage: item.isAdmin || reward.createdByUserId === currentUserId,
        }))))
        setRewardBalance(responses.reduce<RewardBalanceResponse>((total, { balanceData }) => ({
          earnedPoints: total.earnedPoints + balanceData.earnedPoints,
          spentPoints: total.spentPoints + balanceData.spentPoints,
          availablePoints: total.availablePoints + balanceData.availablePoints,
        }), { earnedPoints: 0, spentPoints: 0, availablePoints: 0 }))
      })
      .catch((err) => {
        if (!cancelled) {
          setRewardError(err instanceof ApiError ? err.message : 'Failed to load rewards')
        }
      })
      .finally(() => {
        if (!cancelled) setRewardLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dataHouseholds, member.id, currentUserId])

  const graphData = useMemo(() => {
    const counts = new Map(
      progressData.map((item) => [item.date, item.completedChores]),
    )

    const max = Math.max(
      ...progressData.map((item) => item.completedChores),
      1,
    )

    return week.map((item) => {
      const count = counts.get(item.date) ?? 0

      return {
        day: item.day,
        count,
        value: Math.round((count / max) * 100),
      }
    })
  }, [progressData])

  const ranking = leaderboard

  const linePoints = graphData.map((item, index) =>
    `${30 + index * 106},${190 - item.value * 1.55}`,
  ).join(' ')

  const toggleChore = async (chore: Chore) => {
    try {
      const updated = chore.completed
        ? await uncompleteChore(chore.householdId, chore.backendId, chore.date)
        : await completeChore(chore.householdId, chore.backendId, chore.date)
      setGroupChores((current) => current.map((item) => item.id === updated.id && item.groupId === updated.groupId ? updated : item))
      setChores((current) =>
        current.map((item) => item.id === chore.id && item.householdId === chore.householdId && item.date === chore.date ? toUIChore(updated, chore.date, chore.householdName) : item),
      )
      setPoints((value) => Math.max(0, value + (chore.completed ? -1 : 1) * (updated.points ?? 0)))

      // Reward balances are derived from completed-chore points, so refresh
      // every household balance after a completion changes.
      void Promise.all(dataHouseholds.map(async (item) => ({
        householdId: item.id,
        balance: await fetchRewardBalance(item.id),
      })))
        .then((balances) => {
          const byHousehold = new Map(
            balances.map((item) => [item.householdId, item.balance]),
          )

          setRewardBalance(balances.reduce<RewardBalanceResponse>((total, item) => ({
            earnedPoints: total.earnedPoints + item.balance.earnedPoints,
            spentPoints: total.spentPoints + item.balance.spentPoints,
            availablePoints: total.availablePoints + item.balance.availablePoints,
          }), { earnedPoints: 0, spentPoints: 0, availablePoints: 0 }))

          setRewards((current) => current.map((reward) => ({
            ...reward,
            householdBalance: byHousehold.get(reward.householdId)?.availablePoints
              ?? reward.householdBalance,
          })))
        })
        .catch(() => {
          // The chore update succeeded; a later page load can retry the balance.
        })

      // Chore completion already succeeded; refresh gamification data separately
      if (!personalProfileView) void Promise.all([
        fetchLeaderboard(chore.householdId),
        fetchWeeklyProgress(chore.householdId, member.id),
        fetchAchievements(chore.householdId, member.id),
        fetchStreak(chore.householdId, member.id),
      ])
        .then(([
          refreshedLeaderboard,
          refreshedProgress,
          refreshedAchievements,
          refreshedStreak,
        ]) => {
          setLeaderboard(refreshedLeaderboard)
          setProgressData(refreshedProgress)
          setAchievements(refreshedAchievements)
          setStreak(refreshedStreak)
        })
        .catch(() => {
          // Do not report the chore completion as failed if only a refresh fails.
        })
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update chore')
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
    const time = String(data.get('time') ?? '')
    const recurrenceDays = data.getAll('recurrenceDays').map(String)

    if (!title) {
      setActionError('Chore name is required')
      return
    }

    if (!Number.isFinite(points) || points < 0) {
      setActionError('Points must be a non-negative number')
      return
    }

    const dueDate = new Date(`${editingChore.date}T${time}`)
    if (!time || Number.isNaN(dueDate.getTime())) {
      setActionError('Choose a valid time')
      return
    }

    if (editingRecurring && recurrenceDays.length === 0) {
      setActionError('Choose at least one day for a recurring task')
      return
    }

    try {
      const updated = await updateChore(editingChore.householdId, editingChore.backendId, {
        title,
        description,
        points,
        dueDate: dueDate.toISOString(),
        icon: editingChore.icon,
        recurring: editingRecurring,
        recurrenceDays,
      })
      setGroupChores((current) => current.map((item) => item.id === updated.id && item.groupId === updated.groupId ? updated : item))
      setChores((current) => current.flatMap((item) => item.backendId === editingChore.backendId && item.householdId === editingChore.householdId ? [] : [item]).concat(expandChoresForWeek([updated], householdNames)))
      setEditingChore(null)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update chore')
    }
  }

  const confirmDeleteChore = async () => {
    if (!deletingChore) return

    setActionError('')
    try {
      await deleteChore(deletingChore.householdId, deletingChore.backendId)
      setGroupChores((current) => current.filter((item) => item.id !== deletingChore.backendId || item.groupId !== deletingChore.householdId))
      setChores((current) => current.filter((item) => item.backendId !== deletingChore.backendId || item.householdId !== deletingChore.householdId))
      const deletedRecord = groupChores.find((item) => item.id === deletingChore.backendId && item.groupId === deletingChore.householdId)
      if (deletedRecord) setPoints((value) => Math.max(0, value - (deletedRecord.points ?? 0) * (deletedRecord.recurring ? deletedRecord.completedDates.length : deletedRecord.status === 'COMPLETED' ? 1 : 0)))
      setDeletingChore(null)
      // Refresh derived gamification after deletion.
      void Promise.all([
        fetchWeeklyProgress(household.id, member.id),
        fetchStreak(household.id, member.id),
      ])
        .then(([refreshedProgress, refreshedStreak]) => {
          setProgressData(refreshedProgress)
          setStreak(refreshedStreak)
        })
        .catch(() => {
          // deletion already succeeded
        })
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

  const submitReward = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRewardError('')

    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const description = String(data.get('description') ?? '').trim()
    const cost = Number(data.get('cost'))

    if (!name) {
      setRewardError('Reward name is required')
      return
    }

    if (!Number.isFinite(cost) || cost < 1) {
      setRewardError('Reward cost must be at least 1 point')
      return
    }

    try {
      const created = await createReward(household.id, {
        name,
        description,
        cost,
      })
      setRewards((current) => [{
        ...created,
        householdId: household.id,
        householdName: household.name,
        householdBalance: rewardBalance?.availablePoints ?? 0,
        canManage: household.isAdmin || created.createdByUserId === currentUserId,
      }, ...current])
      setShowRewardForm(false)
    } catch (err) {
      setRewardError(err instanceof ApiError ? err.message : 'Failed to create reward')
    }
  }

  const handleRedeemReward = async (reward: DashboardReward) => {
    setRewardError('')
    setRedeemingRewardId(reward.id)

    try {
      const result = await redeemReward(reward.householdId, reward.id)
      setRewardBalance((current) => current
        ? {
            ...current,
            spentPoints: current.spentPoints + result.cost,
            availablePoints: result.remainingPoints,
          }
        : current,
      )
      setRewards((current) => current.map((item) => item.id === reward.id && item.householdId === reward.householdId
        ? { ...item, householdBalance: result.remainingPoints }
        : item))
    } catch (err) {
      setRewardError(err instanceof ApiError ? err.message : 'Failed to redeem reward')
    } finally {
      setRedeemingRewardId(null)
    }
  }

  const confirmDeactivateReward = async () => {
    if (!deletingReward) return

    setRewardError('')
    try {
      await deactivateReward(deletingReward.householdId, deletingReward.id)
      setRewards((current) => current.filter((reward) => reward.id !== deletingReward.id || reward.householdId !== deletingReward.householdId))
      setDeletingReward(null)
    } catch (err) {
      setRewardError(err instanceof ApiError ? err.message : 'Failed to remove reward')
    }
  }

  return (
    <main className="app-shell member-dashboard">
      <header className="app-header dashboard-header">
        <button
          className="brand brand-home-button"
          type="button"
          onClick={onHome}
          aria-label="Go to households"
          title="Go to households"
        >
          <span className="brand-mark"><HomeMark /></span>
          <span>Smart Chores</span>
        </button>
        {!personalProfileView && (
          <button
            className="household-chip"
            type="button"
            onClick={onBack}
            aria-label={`Return to ${household.name}`}
            title={`Return to ${household.name}`}
          >
            <span>{household.emoji}</span>{household.name}
          </button>
        )}
      </header>

      <section className="dashboard-content">
        <button className="back-button" type="button" onClick={onBack}>{personalProfileView ? '← Back' : '← All members'}</button>
        <div className="member-hero">
          <div className="dashboard-person"><span className={`dashboard-avatar ${avatarEmoji(member.avatarKey) ? 'emoji-avatar' : ''}`} style={{ background: avatarEmoji(member.avatarKey) ? '#fff' : member.color }}>{avatarEmoji(member.avatarKey) ?? member.initials}</span><div><span className="eyebrow">Daily dashboard</span><h1>{member.name}</h1><p>{completedCount} of {dailyChores.length} chores complete today</p></div></div>
          <div className="dashboard-stats">
            <div className="dashboard-score">
              <span>★</span>
              <div>
                <strong>{points}</strong>
                <small>points earned</small>
              </div>
            </div>

            <div
              className="dashboard-streak"
              title="Complete at least one chore on consecutive days to keep your streak alive."
            >
              <span>🔥</span>
              <div>
                <strong>{streak?.currentStreak ?? 0}</strong>
                <small>day streak · best {streak?.longestStreak ?? 0}</small>
              </div>
            </div>
          </div>
        </div>

        <nav className="dashboard-tabs" aria-label="Member dashboard">
          <button className={tab === 'chores' ? 'active' : ''} onClick={() => setTab('chores')}><span>✓</span> Chores</button>
          <button className={tab === 'trophies' ? 'active' : ''} onClick={() => setTab('trophies')}><span>♕</span> Trophies</button>
          <button className={tab === 'rewards' ? 'active' : ''} onClick={() => setTab('rewards')}><span>🎁</span> Rewards</button>
          <button className={tab === 'progress' ? 'active' : ''} onClick={() => setTab('progress')}><span>↗</span> Progress</button>
        </nav>

        {tab === 'chores' && <>
          <div className="week-calendar">
            <div className="calendar-title"><div><strong>{selectedDate === today ? 'Today' : week.find((item) => item.date === selectedDate)?.day}, {week.find((item) => item.date === selectedDate)?.label}</strong><span>Select a day to view its chores</span></div><span className="calendar-icon">▦</span></div>
            <div className="week-days">{week.map((item) => <button key={item.date} className={selectedDate === item.date ? 'selected' : ''} onClick={() => setSelectedDate(item.date)}><small>{item.day}</small><strong>{item.dayNumber}</strong><i>{chores.some((chore) => chore.date === item.date) && '•'}</i></button>)}</div>
          </div>

          <div className="chores-heading"><div><span className="eyebrow">Any time</span><h2>Daily chores</h2></div>{!personalProfileView && canCreateForDashboard && <button className="add-chore-button" type="button" onClick={() => setShowAdd(true)}><span>+</span> Add chore</button>}</div>
          <div className="chore-list">
            {loadingChores && <p style={{ textAlign: 'center', opacity: 0.6, padding: '1rem' }}>Loading chores...</p>}
            {!loadingChores && dailyChores.length ? dailyChores.map((chore) => <article className={`chore-card ${chore.completed ? 'completed' : ''}`} key={`${chore.householdId}-${chore.id}-${chore.date}`}>
              <button className="chore-check" type="button" onClick={() => toggleChore(chore)} aria-label={chore.completed ? `Mark ${chore.title} incomplete` : `Complete ${chore.title}`}>{chore.completed && '✓'}</button>
              <span className="chore-emoji">{chore.icon}</span>
              <div className="chore-info"><span>◷ {chore.time}{personalProfileView && chore.householdName ? ` · ${chore.householdName}` : ''}</span><strong>{chore.title}</strong>{chore.description && <small>{chore.description}</small>}</div>
              {(personalProfileView ? dataHouseholds.find((item) => item.id === chore.householdId)?.isAdmin : household.isAdmin) && <div style={{ display: 'flex', gap: '0.35rem' }}><button type="button" onClick={() => { setActionError(''); setEditingRecurring(chore.recurring); setEditingChore({ ...chore }) }} title="Edit chore">✎</button><button type="button" onClick={() => { setActionError(''); setDeletingChore(chore) }} title="Delete chore">🗑</button></div>}
              <div className="chore-points"><strong>{chore.points}</strong><span>★</span></div>
            </article>) : !loadingChores && <div className="empty-state"><span>☀️</span><h3>No chores for this day</h3><p>Enjoy the free time or add a new chore.</p></div>}
          </div>
        </>}

        {tab === 'trophies' && <section className="tab-page"><div className="tab-page-heading"><span className="eyebrow">Badge cabinet</span><h2>Trophies</h2><p>Every completed chore gets you closer to a new achievement.</p></div><div className="trophy-grid">{achievements.map((achievement) => <article className={`trophy-card ${achievement.earned ? 'earned' : ''}`} key={achievement.code}><span>{achievement.icon}</span><small>{achievement.earned ? 'Earned' : `${Math.min(achievement.currentValue, achievement.requiredValue)} / ${achievement.requiredValue}`}</small><h3>{achievement.name}</h3><p>{achievement.description}</p>{achievement.earned && <i>✓</i>}</article>)}<article className={`trophy-card badges-card ${points >= 20 ? 'earned' : ''}`}><span>🎖️</span><small>{points % 20} / 20 pts to next</small><strong className="badge-count">{Math.floor(points / 20)}</strong><h3>Badges earned</h3><p>One badge earned for every 20 points.</p><div className="earned-badges">{Array.from({ length: Math.floor(points / 20) }, (_, index) => <span key={index} title={`Badge ${index + 1}`}>🏅</span>)}{points < 20 && <em>No badges yet</em>}</div></article></div></section>}

        {tab === 'rewards' && (
          <section className="tab-page">
            <div className="tab-page-heading rewards-heading">
              <div>
                <span className="eyebrow">Household perks</span>
                <h2>Rewards</h2>
                <p>Spend points earned from completed chores on household rewards.</p>
              </div>
              {!personalProfileView && canCreateForDashboard && (
                <button
                  className="add-chore-button"
                  type="button"
                  onClick={() => {
                    setRewardError('')
                    setShowRewardForm(true)
                  }}
                >
                  <span>+</span> Add reward
                </button>
              )}
            </div>

            <div className="reward-balance-card">
              <div>
                <span>Available balance</span>
                <strong>{rewardBalance?.availablePoints ?? 0} pts</strong>
              </div>
              <div className="reward-balance-breakdown">
                <span>Earned <b>{rewardBalance?.earnedPoints ?? 0}</b></span>
                <span>Spent <b>{rewardBalance?.spentPoints ?? 0}</b></span>
              </div>
            </div>

            {rewardError && (
              <p className="form-message error-message" role="alert">
                {rewardError}
              </p>
            )}

            {rewardLoading ? (
              <p className="reward-loading">Loading rewards...</p>
            ) : rewards.length === 0 ? (
              <div className="empty-state reward-empty">
                <span>🎁</span>
                <h3>No rewards yet</h3>
                <p>{household.isAdmin ? 'Create the first household reward.' : 'Your household managers have not added rewards yet.'}</p>
              </div>
            ) : (
              <div className="reward-grid">
                {rewards.map((reward) => {
                  const affordable = reward.householdBalance >= reward.cost

                  return (
                    <article className="reward-card" key={`${reward.householdId}-${reward.id}`}>
                      <div className="reward-card-top">
                        <span className="reward-gift">🎁</span>
                        <strong>{reward.cost} pts</strong>
                      </div>
                      <h3>{reward.name}</h3>
                      {personalProfileView && <small className="reward-household">{reward.householdName}</small>}
                      <p>{reward.description || 'A custom household reward.'}</p>

                      <div className="reward-card-actions">
                        <button
                          className="submit-button reward-redeem"
                          type="button"
                          disabled={!affordable || redeemingRewardId === reward.id}
                          onClick={() => handleRedeemReward(reward)}
                        >
                          {redeemingRewardId === reward.id
                            ? 'Redeeming...'
                            : affordable
                              ? 'Redeem'
                              : 'Not enough points'}
                        </button>

                        {reward.canManage && (
                          <button
                            className="member-secondary-action reward-remove"
                            type="button"
                            onClick={() => setDeletingReward(reward)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'progress' && <section className="tab-page"><div className="tab-page-heading"><span className="eyebrow">This week</span><h2>Progress</h2><p>See consistency, completed chores, and points earned over time.</p></div><div className="stats-row"><div><strong>{chores.filter((c) => c.completed).length}</strong><span>Chores completed</span></div><div><strong>{points}</strong><span>Total points</span></div><div><strong>{todaysChores.length}</strong><span>Today's chores</span></div></div><div className="progress-chart"><div className="chart-top"><strong>Weekly activity</strong><span>Chores completed</span></div><div className="line-chart"><svg viewBox="0 0 700 225" role="img" aria-label="Line graph of chores completed this week"><line x1="30" y1="35" x2="666" y2="35" /><line x1="30" y1="112" x2="666" y2="112" /><line x1="30" y1="190" x2="666" y2="190" /><polyline className="activity-line" points={linePoints} />{graphData.map((item, index) => <g key={item.day}><circle cx={30 + index * 106} cy={190 - item.value * 1.55} r="6" /><text className="graph-value" x={30 + index * 106} y={178 - item.value * 1.55}>{item.count}</text><text className="graph-day" x={30 + index * 106} y="216">{item.day}</text></g>)}</svg></div></div>{!personalProfileView && <div className="ranking-table"><div className="ranking-heading"><span>🏁</span><div><strong>Household ranking</strong><small>Ranked by total points</small></div></div>{ranking.map((entry) => <div className={`ranking-row ${entry.userId === member.id ? 'current-member' : ''}`} key={entry.userId}><strong>#{entry.rank}</strong><span>{entry.name}{entry.userId === member.id && <small>You</small>}</span><b>{entry.totalPoints} pts</b></div>)}</div>}</section>}
      </section>

      {showAdd && canCreateForDashboard && <div className="modal-backdrop" onMouseDown={() => setShowAdd(false)}><section className="modal chore-modal" role="dialog" aria-modal="true" aria-labelledby="add-chore-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowAdd(false)}>×</button><span className="modal-icon">🧹</span><h2 id="add-chore-title">Add a chore</h2><p>Assign a new task to {member.name} for {week.find((day) => day.date === selectedDate)?.label}.</p><form onSubmit={addChore}><label>Choose an icon</label><div className="icon-picker">{CHORE_ICONS.map((icon, index) => <label key={icon}><input type="radio" name="icon" value={icon} defaultChecked={index === 0} /><span>{icon}</span></label>)}</div><label htmlFor="chore-title">Chore name</label><input className="modal-input" id="chore-title" name="title" placeholder="e.g. Water the plants" required /><label htmlFor="chore-description">Description</label><input className="modal-input" id="chore-description" name="description" placeholder="e.g. Clean the counter and wash the dishes" /><div className="modal-row"><div><label htmlFor="chore-time">Time</label><input className="modal-input" id="chore-time" name="time" type="time" required /></div><div><label htmlFor="chore-points">Points</label><input className="modal-input" id="chore-points" name="points" type="number" min="1" max="50" defaultValue="5" required /></div></div><label className="recurring-toggle"><input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} /> Recurring task</label>{recurring && <fieldset className="weekday-picker"><legend>Repeat on</legend>{week.map((day) => <label key={day.dayOfWeek}><input type="checkbox" name="recurrenceDays" value={day.dayOfWeek} /><span>{day.day.slice(0, 2)}</span></label>)}</fieldset>}{addError && <p className="form-message error-message" role="alert">{addError}</p>}<button className="submit-button" type="submit">Add chore <span>→</span></button></form></section></div>}

      {editingChore && (personalProfileView ? dataHouseholds.find((item) => item.id === editingChore.householdId)?.isAdmin : household.isAdmin) && (
        <div className="modal-backdrop" onMouseDown={() => setEditingChore(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-chore-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setEditingChore(null)}>×</button>
            <span className="modal-icon">{editingChore.icon}</span>
            <h2 id="edit-chore-title">Edit chore</h2>
            <p>Update the task details for {member.name}.</p>
            <form onSubmit={submitEditChore}>
              <label>Choose an icon</label>
              <div className="icon-picker">{CHORE_ICONS.map((icon) => <label key={icon}><input type="radio" name="icon" value={icon} checked={icon === editingChore.icon} onChange={() => setEditingChore((chore) => chore ? { ...chore, icon } : chore)} /><span>{icon}</span></label>)}</div>
              <label htmlFor="edit-chore-name">Chore name</label>
              <input className="modal-input" id="edit-chore-name" name="title" defaultValue={editingChore.title} required />
              <label htmlFor="edit-chore-description">Description</label>
              <input className="modal-input" id="edit-chore-description" name="description" defaultValue={editingChore.description} />
              <label htmlFor="edit-chore-points">Points</label>
              <input className="modal-input" id="edit-chore-points" name="points" type="number" min="0" max="50" defaultValue={editingChore.points} required />
              <label htmlFor="edit-chore-time">Time</label>
              <input className="modal-input" id="edit-chore-time" name="time" type="time" defaultValue={editingChore.time} required />
              <label className="recurring-toggle"><input type="checkbox" checked={editingRecurring} onChange={(event) => setEditingRecurring(event.target.checked)} /> Recurring task</label>
              {editingRecurring && <fieldset className="weekday-picker"><legend>Repeat on</legend>{week.map((day) => <label key={day.dayOfWeek}><input type="checkbox" name="recurrenceDays" value={day.dayOfWeek} defaultChecked={groupChores.find((chore) => chore.id === editingChore.backendId)?.recurrenceDays.includes(day.dayOfWeek)} /><span>{day.day.slice(0, 2)}</span></label>)}</fieldset>}
              {actionError && <p className="form-message error-message" role="alert">{actionError}</p>}
              <button className="submit-button" type="submit">Save changes <span>→</span></button>
            </form>
          </section>
        </div>
      )}

      {showRewardForm && canCreateForDashboard && (
        <div className="modal-backdrop" onMouseDown={() => setShowRewardForm(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-reward-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={() => setShowRewardForm(false)}>×</button>
            <span className="modal-icon">🎁</span>
            <h2 id="add-reward-title">Add household reward</h2>
            <p>Create a reward members can unlock with their available points.</p>

            <form onSubmit={submitReward}>
              <label htmlFor="reward-name">Reward name</label>
              <input
                className="modal-input"
                id="reward-name"
                name="name"
                placeholder="e.g. Choose dinner"
                maxLength={100}
                required
              />

              <label htmlFor="reward-description">Description</label>
              <input
                className="modal-input"
                id="reward-description"
                name="description"
                placeholder="e.g. Pick what the household eats tonight"
                maxLength={300}
              />

              <label htmlFor="reward-cost">Cost</label>
              <input
                className="modal-input"
                id="reward-cost"
                name="cost"
                type="number"
                min="1"
                max="100000"
                defaultValue="50"
                required
              />

              {rewardError && <p className="form-message error-message" role="alert">{rewardError}</p>}
              <button className="submit-button" type="submit">Create reward <span>→</span></button>
            </form>
          </section>
        </div>
      )}

      {deletingReward && deletingReward.canManage && (
        <div className="modal-backdrop" onMouseDown={() => setDeletingReward(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-reward-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={() => setDeletingReward(null)}>×</button>
            <span className="modal-icon">🎁</span>
            <h2 id="delete-reward-title">Remove reward?</h2>
            <p><strong>{deletingReward.name}</strong> will no longer be available to redeem.</p>
            {rewardError && <p className="form-message error-message" role="alert">{rewardError}</p>}
            <div className="title-modal-actions">
              <button className="member-secondary-action" type="button" onClick={() => setDeletingReward(null)}>Cancel</button>
              <button className="submit-button" type="button" onClick={confirmDeactivateReward}>Remove reward</button>
            </div>
          </section>
        </div>
      )}

      {deletingChore && (personalProfileView ? dataHouseholds.find((item) => item.id === deletingChore.householdId)?.isAdmin : household.isAdmin) && (
        <div className="modal-backdrop" onMouseDown={() => setDeletingChore(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-chore-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setDeletingChore(null)}>×</button>
            <span className="modal-icon">🗑</span>
            <h2 id="delete-chore-title">Delete chore?</h2>
            <p><strong>{deletingChore.title}</strong> will be permanently deleted.</p>
            {actionError && <p className="form-message error-message" role="alert">{actionError}</p>}
            <div className="modal-row delete-actions">
              <button className="back-button" type="button" onClick={() => setDeletingChore(null)}>Cancel</button>
              <button className="submit-button" type="button" onClick={confirmDeleteChore}>Delete chore</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
