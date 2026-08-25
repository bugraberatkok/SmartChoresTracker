import { useEffect, useState, useCallback } from 'react'
import HouseholdsPage from './HouseholdsPage'
import LoginPage from './LoginPage'
import MemberDashboard from './MemberDashboard'
import MembersPage from './MembersPage'
import RegisterPage from './RegisterPage'
import type { Household, Member } from './types'
import { deriveColor, deriveEmoji, deriveInitials } from './types'
import {
  setToken, clearToken, isLoggedIn, fetchCurrentUser, fetchGroups, fetchGroupMembers,
  type AuthUser, type GroupResponse, type GroupMemberResponse,
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
    emoji: deriveEmoji(group.id),
    isAdmin: group.ownerId === currentUserId,
    members: [],
    createdAt: group.createdAt,
  }
}

function toMember(m: GroupMemberResponse): Member {
  return {
    id: m.userId,
    membershipId: m.membershipId,
    name: m.name,
    email: m.email,
    initials: deriveInitials(m.name),
    points: 0,    // will be enriched from chore data
    chores: 0,    // will be enriched from chore data
    color: deriveColor(m.userId),
    isAdmin: m.role === 'OWNER' || m.role === 'ADMIN',
    role: m.role,
  }
}

// ---- App ------------------------------------------------------------------

function App() {
  const [page, setPage] = useState<Page>(isLoggedIn() ? 'households' : 'login')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [households, setHouseholds] = useState<Household[]>([])
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(false)

  // ---- load current user & groups after login ----------------------------

  const loadUserAndGroups = useCallback(async () => {
    setLoading(true)
    try {
      const user = await fetchCurrentUser()
      setCurrentUser(user)

      const groups = await fetchGroups()
      setHouseholds(groups.map((g) => toHousehold(g, user.id)))
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
    if (isLoggedIn()) {
      loadUserAndGroups()
    }
  }, [loadUserAndGroups])

  // ---- auth handlers -----------------------------------------------------

  const handleLogin = (token: string, user: AuthUser) => {
    setToken(token)
    setCurrentUser(user)
    loadUserAndGroups()
    setPage('households')
  }

  const handleLogout = () => {
    clearToken()
    setCurrentUser(null)
    setHouseholds([])
    setSelectedHousehold(null)
    setSelectedMember(null)
    setPage('login')
  }

  // ---- household selected → fetch members --------------------------------

  const selectHousehold = async (household: Household) => {
    setSelectedHousehold(household)
    setPage('members')

    try {
      const membersData = await fetchGroupMembers(household.id)
      const members = membersData.map(toMember)
      const enriched = { ...household, members }
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

  const handleGroupCreated = (group: GroupResponse) => {
    if (!currentUser) return
    const newHousehold = toHousehold(group, currentUser.id)
    setHouseholds((prev) => [...prev, newHousehold])
  }

  // ---- render -------------------------------------------------------------

  if (page === 'register') {
    return <RegisterPage onSignIn={() => setPage('login')} onRegister={() => setPage('login')} />
  }

  if (page === 'households') {
    return (
      <HouseholdsPage
        households={households}
        currentUser={currentUser}
        loading={loading}
        onSelect={selectHousehold}
        onGroupCreated={handleGroupCreated}
        onLogout={handleLogout}
      />
    )
  }

  if (page === 'members' && selectedHousehold) {
    return (
      <MembersPage
        household={selectedHousehold}
        currentUserName={currentUser?.name ?? ''}
        onBack={() => setPage('households')}
        onSelectMember={(member) => {
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
        onBack={() => setPage('members')}
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
