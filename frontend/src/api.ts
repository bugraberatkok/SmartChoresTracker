// ---------------------------------------------------------------------------
// api.ts – thin wrapper around fetch for the Spring Boot backend
// ---------------------------------------------------------------------------

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ?? '/api'
).replace(/\/$/, '')

// ---- token helpers --------------------------------------------------------

let accessToken: string | null = localStorage.getItem('accessToken')

export function getToken() {
  return accessToken
}

export function setToken(token: string) {
  accessToken = token
  localStorage.setItem('accessToken', token)
}

export function clearToken() {
  accessToken = null
  localStorage.removeItem('accessToken')
}

export function isLoggedIn() {
  return !!accessToken
}

// ---- generic request helper -----------------------------------------------

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && accessToken) {
    clearToken()
    window.dispatchEvent(new Event('auth:unauthorized'))
  }

  // 204 No Content → no body to parse
  if (res.status === 204) return undefined as unknown as T

  const body = await res.json()

  if (!res.ok) {
    // Spring Boot validation errors come as { message, errors } or { error }
    const message =
      body?.message ?? body?.error ?? `Request failed (${res.status})`
    throw new ApiError(message, res.status, body)
  }

  return body as T
}

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

// ---- Auth -----------------------------------------------------------------

export interface AuthUser {
  id: number
  name: string
  email: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  user: AuthUser
}

export function login(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function register(name: string, email: string, password: string) {
  return request<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export function fetchCurrentUser() {
  return request<AuthUser>('/users/me')
}

// ---- Groups (Households) --------------------------------------------------

export interface GroupResponse {
  id: number
  name: string
  description: string | null
  ownerId: number
  inviteCode: string | null
  createdAt: string
  updatedAt: string
}

export function fetchGroups() {
  return request<GroupResponse[]>('/groups')
}

export function fetchGroupById(groupId: number) {
  return request<GroupResponse>(`/groups/${groupId}`)
}

export function createGroup(name: string, description?: string) {
  return request<GroupResponse>('/groups', {
    method: 'POST',
    body: JSON.stringify({ name, description: description ?? '' }),
  })
}

export function updateGroup(
  groupId: number,
  data: { name?: string; description?: string },
) {
  return request<GroupResponse>(`/groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteGroup(groupId: number) {
  return request<void>(`/groups/${groupId}`, { method: 'DELETE' })
}

export function getOrCreateInviteCode(groupId: number) {
  return request<{ inviteCode: string }>(`/groups/${groupId}/invite-code`, {
    method: 'POST',
  })
}

// ---- Group Members --------------------------------------------------------

export interface GroupMemberResponse {
  membershipId: number
  userId: number
  name: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  joinedAt: string
}

export function fetchGroupMembers(groupId: number) {
  return request<GroupMemberResponse[]>(`/groups/${groupId}/members`)
}

export function addGroupMember(groupId: number, email: string) {
  return request<GroupMemberResponse>(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}


export function joinGroupByCode(inviteCode: string) {
  return request<GroupMemberResponse>('/groups/join-by-code', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  })
}

export function removeGroupMember(groupId: number, userId: number) {
  return request<void>(`/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
  })
}

// ---- Chores ---------------------------------------------------------------

export interface ChoreResponse {
  id: number
  title: string
  description: string | null
  groupId: number
  assignedUserId: number | null
  createdByUserId: number
  status: 'PENDING' | 'COMPLETED'
  points: number | null
  icon: string
  recurring: boolean
  recurrenceDays: string[]
  completedDates: string[]
  recurrenceStartDate: string | null
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export function fetchGroupChores(groupId: number) {
  return request<ChoreResponse[]>(`/groups/${groupId}/chores`)
}

export function fetchChoreById(groupId: number, choreId: number) {
  return request<ChoreResponse>(`/groups/${groupId}/chores/${choreId}`)
}

export function createChore(
  groupId: number,
  data: {
    title: string
    description?: string
    assignedUserId?: number
    points?: number
    dueDate?: string
    icon?: string
    recurring?: boolean
    recurrenceDays?: string[]
  },
) {
  return request<ChoreResponse>(`/groups/${groupId}/chores`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function completeChore(groupId: number, choreId: number, date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return request<ChoreResponse>(`/groups/${groupId}/chores/${choreId}/complete${query}`, {
    method: 'PATCH',
  })
}


export function updateChore(
  groupId: number,
  choreId: number,
  data: {
    title?: string
    description?: string
    assignedUserId?: number
    points?: number
    dueDate?: string
    icon?: string
    recurring?: boolean
    recurrenceDays?: string[]
  },
) {
  return request<ChoreResponse>(`/groups/${groupId}/chores/${choreId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}


export function deleteChore(groupId: number, choreId: number) {
  return request<void>(`/groups/${groupId}/chores/${choreId}`, {
    method: 'DELETE',
  })
}

export interface LeaderboardEntryResponse {
  userId: number
  name: string
  totalPoints: number
  completedChores: number
  rank: number
}

export function fetchLeaderboard(groupId: number) {
  return request<LeaderboardEntryResponse[]>(
      `/groups/${groupId}/gamification/leaderboard`,
  )
}

export interface AchievementResponse {
  code: string
  name: string
  description: string
  icon: string
  requiredValue: number
  currentValue: number
  earned: boolean
}



export interface ProgressDayResponse {
  date: string
  day: string
  completedChores: number
}

export function fetchAchievements(groupId: number, memberUserId: number) {
  return request<AchievementResponse[]>(
    `/groups/${groupId}/gamification/members/${memberUserId}/achievements`,
  )
}



export function fetchWeeklyProgress(groupId: number, memberUserId: number) {
  return request<ProgressDayResponse[]>(
    `/groups/${groupId}/gamification/members/${memberUserId}/progress`,
  )
}
