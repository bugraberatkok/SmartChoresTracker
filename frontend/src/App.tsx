import { useEffect, useState, useCallback } from 'react'
import HouseholdsPage from './HouseholdsPage'
import LoginPage from './LoginPage'
import MemberDashboard from './MemberDashboard'
import MembersPage from './MembersPage'
import RegisterPage from './RegisterPage'
import type { Household, Member } from './types'
import { deriveColor, deriveEmoji, deriveInitials } from './types'
import {
  setToken, clearToken, isLoggedIn, fetchCurrentUser, fetchGroups, fetchGroupMembers, fetchGroupChores,
  type AuthUser, type GroupResponse, type GroupMemberResponse, type ChoreResponse,
} from './api'
import './App.css'

type Page = 'login' | 'register' | 'households' | 'members' | 'dashboard'

// ---- mapping helpers (backend DTO → frontend UI types) --------------------

function toHousehold(group: GroupResponse, currentUserId: number): Household {
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? undefined,
    ownerId: group.ownerId,
    inviteCode: group.inviteCode ?? undefined,
    emoji: group.emoji ?? deriveEmoji(group.id),
    isAdmin: group.ownerId === currentUserId,
    members: [],
    createdAt: group.createdAt,
  }
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isChoreScheduledToday(chore: ChoreResponse, today: Date): boolean {
  const todayKey = localDateKey(today)

  if (chore.recurring) {
    const dayName = today
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase()

    return (
      chore.recurrenceDays.includes(dayName) &&
      (!chore.recurrenceStartDate || chore.recurrenceStartDate <= todayKey)
    )
  }

  if (!chore.dueDate) return false
  return localDateKey(new Date(chore.dueDate)) === todayKey
}

function toMember(m: GroupMemberResponse, chores: ChoreResponse[]): Member {
  const assignedChores = chores.filter((chore) => chore.assignedUserId === m.userId)
  const points = assignedChores
    .reduce((sum, chore) => sum + (chore.points ?? 0) * (
      chore.recurring ? chore.completedDates.length : chore.status === 'COMPLETED' ? 1 : 0
    ), 0)

  const today = new Date()
  const todayKey = localDateKey(today)
  const todaysChores = assignedChores.filter((chore) =>
    isChoreScheduledToday(chore, today),
  )
  const todayCompleted = todaysChores.filter((chore) =>
    chore.recurring
      ? chore.completedDates.includes(todayKey)
      : chore.status === 'COMPLETED',
  ).length

  return {
    id: m.userId,
    membershipId: m.membershipId,
    name: m.name,
    email: m.email,
    initials: deriveInitials(m.name),
    points,
    chores: assignedChores.length,
    color: deriveColor(m.userId),
    isAdmin: m.role === 'OWNER' || m.role === 'ADMIN',
    role: m.role,
    displayTitle: m.displayTitle ?? 'Member',
    avatarKey: m.avatarKey,
    todayChores: todaysChores.length,
    todayCompleted,
  }
}

// ---- App ------------------------------------------------------------------

function App() {
  const [page, setPage] = useState<Page>(isLoggedIn() ? 'households' : 'login')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [households, setHouseholds] = useState<Household[]>([])
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [personalProfileView, setPersonalProfileView] = useState(false)
  const [loading, setLoading] = useState(isLoggedIn())

  // ---- load current user & groups after login ----------------------------

  const loadUserAndGroups = useCallback(async () => {
    try {
      const user = await fetchCurrentUser()
      setCurrentUser(user)

      const groups = await fetchGroups()
      const populatedHouseholds = await Promise.all(groups.map(async (group) => {
        const household = toHousehold(group, user.id)
        try {
          const members = await fetchGroupMembers(group.id)
          household.members = members.map((member) => toMember(member, []))
          const currentMembership = members.find((member) => member.userId === user.id)
          household.isAdmin = currentMembership?.role === 'OWNER' || currentMembership?.role === 'ADMIN'
        } catch {
          // Keep this household visible if its membership request fails.
        }
        return household
      }))
      setHouseholds(populatedHouseholds)
    } catch {
      // If token is stale / invalid, kick back to login
      clearToken()
      setCurrentUser(null)
      setPage('login')
    } finally {
      setLoading(false)
    }
  }, [])

  // On mount, if we have a saved token, try to restore the session
  useEffect(() => {
    if (!isLoggedIn()) return

    void Promise.resolve().then(loadUserAndGroups)
  }, [loadUserAndGroups])

  // ---- auth handlers -----------------------------------------------------

  const handleLogin = (token: string, user: AuthUser) => {
    setToken(token)
    setCurrentUser(user)
    setLoading(true)
    loadUserAndGroups()
    setPage('households')
  }

  const handleLogout = () => {
    clearToken()
    setCurrentUser(null)
    setHouseholds([])
    setSelectedHousehold(null)
    setSelectedMember(null)
    setPersonalProfileView(false)
    setPage('login')
  }

  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null)
      setHouseholds([])
      setSelectedHousehold(null)
      setSelectedMember(null)
      setLoading(false)
      setPage('login')
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  // ---- household selected → fetch members --------------------------------

  const selectHousehold = async (household: Household) => {
    setPersonalProfileView(false)
    setSelectedHousehold(household)
    setPage('members')

    try {
      const [membersData, choresData] = await Promise.all([
        fetchGroupMembers(household.id),
        fetchGroupChores(household.id),
      ])
      const members = membersData.map((member) => toMember(member, choresData))
      const currentMembership = membersData.find((m) => m.userId === currentUser?.id)
      const enriched = {
        ...household,
        members,
        isAdmin:
          currentMembership?.role === 'OWNER' ||
          currentMembership?.role === 'ADMIN',
      }
      setSelectedHousehold(enriched)
      // Also update in the households list so going back shows correct count
      setHouseholds((prev) =>
        prev.map((h) => (h.id === household.id ? enriched : h)),
      )
    } catch {
      // non-fatal: just show empty members
    }
  }

  // ---- callback: new group was created from HouseholdsPage ---------------

  const handleGroupCreated = async (group: GroupResponse) => {
    if (!currentUser) return
    const newHousehold = toHousehold(group, currentUser.id)
    try {
      const members = await fetchGroupMembers(group.id)
      newHousehold.members = members.map((member) => toMember(member, []))
      const currentMembership = members.find((member) => member.userId === currentUser.id)
      newHousehold.isAdmin = currentMembership?.role === 'OWNER' || currentMembership?.role === 'ADMIN'
    } catch {
      // Keep the household visible even if its member count cannot be refreshed.
    }
    setHouseholds((prev) => [...prev, newHousehold])
  }

  const handleGroupUpdated = (group: GroupResponse) => {
    if (!currentUser) return
    setHouseholds((previous) => previous.map((household) =>
      household.id === group.id
        ? { ...toHousehold(group, currentUser.id), members: household.members }
        : household,
    ))
  }

  const handleGroupDeleted = (groupId: number) => {
    setHouseholds((previous) => previous.filter((household) => household.id !== groupId))
  }

  const openCurrentUserProfile = async () => {
    if (!currentUser || households.length === 0) return

    const household = selectedHousehold
      ? households.find((item) => item.id === selectedHousehold.id) ?? households[0]
      : households[0]

    try {
      const [membersData, choresData] = await Promise.all([
        fetchGroupMembers(household.id),
        fetchGroupChores(household.id),
      ])
      const members = membersData.map((member) => toMember(member, choresData))
      const currentMembership = membersData.find((member) => member.userId === currentUser.id)
      const enriched = {
        ...household,
        members,
        isAdmin: currentMembership?.role === 'OWNER' || currentMembership?.role === 'ADMIN',
      }
      const currentMember = members.find((member) => member.id === currentUser.id)
      if (!currentMember) return

      setSelectedHousehold(enriched)
      setSelectedMember(currentMember)
      setPersonalProfileView(true)
      setHouseholds((previous) => previous.map((item) => item.id === enriched.id ? enriched : item))
      setPage('dashboard')
    } catch {
      // Keep the household-selection page visible if profile data cannot load.
    }
  }

  // ---- render -------------------------------------------------------------

  if (page === 'register') {
    return <RegisterPage onSignIn={() => setPage('login')} onRegister={handleLogin} />
  }

  if (page === 'households') {
    return (
      <HouseholdsPage
        households={households}
        currentUser={currentUser}
        loading={loading}
        onSelect={selectHousehold}
        onGroupCreated={handleGroupCreated}
        onGroupUpdated={handleGroupUpdated}
        onGroupDeleted={handleGroupDeleted}
        onGroupLeft={handleGroupDeleted}
        onOpenProfile={openCurrentUserProfile}
        onLogout={handleLogout}
      />
    )
  }

  if (page === 'members' && selectedHousehold) {
    return (
      <MembersPage
        household={selectedHousehold}
        currentUserId={currentUser?.id ?? null}
        onHome={() => setPage('households')}
        onBack={() => setPage('households')}
        onMemberRemoved={(userId) => {
          setSelectedHousehold((prev) =>
            prev ? { ...prev, members: prev.members.filter((m) => m.id !== userId) } : prev,
          )
          setHouseholds((prev) =>
            prev.map((h) =>
              h.id === selectedHousehold.id
                ? { ...h, members: h.members.filter((m) => m.id !== userId) }
                : h,
            ),
          )
        }}
        onMemberAdded={(member) => {
          setSelectedHousehold((previous) => previous ? { ...previous, members: [...previous.members, member] } : previous)
          setHouseholds((previous) => previous.map((item) => item.id === selectedHousehold.id
            ? { ...item, members: [...item.members, member] }
            : item))
        }}
        onLeaveHousehold={(groupId) => {
          setHouseholds((previous) => previous.filter((item) => item.id !== groupId))
          setSelectedHousehold(null)
          setSelectedMember(null)
          setPage('households')
        }}
        onCurrentUserUpdated={(user) => {
          setCurrentUser(user)

          const updateMember = (member: Member): Member =>
            member.id === user.id
              ? {
                  ...member,
                  name: user.name,
                  initials: deriveInitials(user.name),
                  avatarKey: user.avatarKey,
                }
              : member

          setHouseholds((prev) =>
            prev.map((household) => ({
              ...household,
              members: household.members.map(updateMember),
            })),
          )

          setSelectedHousehold((prev) =>
            prev
              ? { ...prev, members: prev.members.map(updateMember) }
              : prev,
          )

          setSelectedMember((prev) =>
            prev ? updateMember(prev) : prev,
          )
        }}
        onMemberUpdated={(updatedMember) => {
          const applyRoleUpdate = (member: Member): Member => {
            if (member.id === updatedMember.id) return updatedMember
            if (updatedMember.role === 'ADMIN' && member.role === 'ADMIN') {
              return { ...member, role: 'MEMBER', isAdmin: false, displayTitle: 'Member' }
            }
            return member
          }

          setSelectedHousehold((prev) =>
            prev
              ? {
                  ...prev,
                  members: prev.members.map(applyRoleUpdate),
                }
              : prev,
          )

          setHouseholds((prev) =>
            prev.map((household) =>
              household.id === selectedHousehold.id
                ? {
                    ...household,
                    members: household.members.map(applyRoleUpdate),
                  }
                : household,
            ),
          )

          setSelectedMember((prev) =>
            prev?.id === updatedMember.id ? updatedMember : prev,
          )
        }}
        onSelectMember={(member) => {
          setPersonalProfileView(false)
          setSelectedMember(member)
          setPage('dashboard')
        }}
      />
    )
  }

  if (page === 'dashboard' && selectedHousehold && selectedMember) {
    return (
      <MemberDashboard
        household={selectedHousehold}
        member={selectedMember}
        personalProfileView={personalProfileView}
        profileHouseholds={households}
        currentUserId={currentUser?.id ?? null}
        onHome={() => setPage('households')}
        onBack={() => personalProfileView ? setPage('households') : selectHousehold(selectedHousehold)}
      />
    )
  }

  return (
    <LoginPage
      onCreateAccount={() => setPage('register')}
      onLogin={handleLogin}
    />
  )
}

export default App
