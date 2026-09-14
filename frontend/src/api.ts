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

  const responseText = await res.text()
  let body: Record<string, unknown> = {}

  if (responseText) {
    try {
      body = JSON.parse(responseText) as Record<string, unknown>
    } catch {
      if (!res.ok) {
        throw new ApiError(
          responseText || `Request failed (${res.status})`,
          res.status,
          responseText,
        )
      }
      throw new ApiError('The server returned an invalid response', res.status, responseText)
    }
  }

  if (!res.ok) {
    // Spring Boot validation errors come as { message, errors } or { error }
    const message =
      (typeof body.message === 'string' ? body.message : undefined)
      ?? (typeof body.error === 'string' ? body.error : undefined)
      ?? `Request failed (${res.status})`
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
  avatarKey: string | null
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

export function updateCurrentUser(data: {
  name?: string
  avatarKey?: string
}) {
  return request<AuthUser>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ---- Groups (Households) --------------------------------------------------

export interface GroupResponse {
  id: number
  name: string
  description: string | null
  emoji: string | null
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

export function createGroup(name: string, description?: string, emoji?: string) {
  return request<GroupResponse>('/groups', {
    method: 'POST',
    body: JSON.stringify({ name, description: description ?? '', emoji }),
  })
}

export function updateGroup(
  groupId: number,
  data: { name?: string; description?: string; emoji?: string },
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
  avatarKey: string | null
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  displayTitle: string | null
  joinedAt: string
}

export interface GroupJoinRequestResponse {
  requestId: number
  groupId: number
  groupName: string
  userId: number
  name: string
  email: string
  requestedAt: string
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
  return request<GroupJoinRequestResponse>('/groups/join-by-code', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  })
}

export function fetchGroupJoinRequests(groupId: number) {
  return request<GroupJoinRequestResponse[]>(`/groups/${groupId}/members/join-requests`)
}

export function approveGroupJoinRequest(groupId: number, requestId: number) {
  return request<GroupMemberResponse>(`/groups/${groupId}/members/join-requests/${requestId}/approve`, {
    method: 'POST',
  })
}

export function rejectGroupJoinRequest(groupId: number, requestId: number) {
  return request<void>(`/groups/${groupId}/members/join-requests/${requestId}`, {
    method: 'DELETE',
  })
}

export function removeGroupMember(groupId: number, userId: number) {
  return request<void>(`/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
  })
}

export function leaveGroup(groupId: number) {
  return request<void>(`/groups/${groupId}/members/leave`, { method: 'DELETE' })
}

export function updateOwnDisplayTitle(
  groupId: number,
  displayTitle: string,
) {
  return request<GroupMemberResponse>(
    `/groups/${groupId}/members/me/display-title`,
    {
      method: 'PATCH',
      body: JSON.stringify({ displayTitle }),
    },
  )
}

export function updateMemberRole(
  groupId: number,
  userId: number,
  role: 'ADMIN' | 'MEMBER',
) {
  return request<GroupMemberResponse>(
    `/groups/${groupId}/members/${userId}/role`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
  )
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

export function uncompleteChore(groupId: number, choreId: number, date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return request<ChoreResponse>(`/groups/${groupId}/chores/${choreId}/uncomplete${query}`, {
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



export interface StreakResponse {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null
}

export interface RewardResponse {
  id: number
  name: string
  description: string | null
  cost: number
  createdByUserId: number
  active: boolean
  createdAt: string
}

export interface RewardBalanceResponse {
  earnedPoints: number
  spentPoints: number
  availablePoints: number
}

export interface RewardRedemptionResponse {
  redemptionId: number
  rewardId: number
  rewardName: string
  cost: number
  remainingPoints: number
  redeemedAt: string
}

export interface RewardRedemptionHistoryResponse {
  redemptionId: number
  rewardId: number
  rewardName: string
  cost: number
  redeemedAt: string
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



export function fetchStreak(groupId: number, memberUserId: number) {
  return request<StreakResponse>(
    `/groups/${groupId}/gamification/members/${memberUserId}/streak`,
  )
}

export function fetchWeeklyProgress(groupId: number, memberUserId: number) {
  return request<ProgressDayResponse[]>(
    `/groups/${groupId}/gamification/members/${memberUserId}/progress`,
  )
}


export function fetchRewards(groupId: number) {
  return request<RewardResponse[]>(`/groups/${groupId}/rewards`)
}

export function fetchRewardBalance(groupId: number) {
  return request<RewardBalanceResponse>(`/groups/${groupId}/rewards/balance`)
}

export function fetchRewardRedemptions(groupId: number) {
  return request<RewardRedemptionHistoryResponse[]>(`/groups/${groupId}/rewards/redemptions`)
}

export function createReward(
  groupId: number,
  data: { name: string; description?: string; cost: number },
) {
  return request<RewardResponse>(`/groups/${groupId}/rewards`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function redeemReward(groupId: number, rewardId: number) {
  return request<RewardRedemptionResponse>(
    `/groups/${groupId}/rewards/${rewardId}/redeem`,
    { method: 'POST' },
  )
}

export function deactivateReward(groupId: number, rewardId: number) {
  return request<void>(`/groups/${groupId}/rewards/${rewardId}`, {
    method: 'DELETE',
  })
}

export type ActivityType = 'CHORE_CREATED' | 'CHORE_COMPLETED' | 'CHORE_UNCOMPLETED'

export interface ActivityResponse {
  id: number
  type: ActivityType
  actorUserId: number
  actorName: string
  choreId: number | null
  choreTitle: string
  createdAt: string
}

export function fetchActivities(groupId: number) {
  return request<ActivityResponse[]>(`/groups/${groupId}/activities`)
}
