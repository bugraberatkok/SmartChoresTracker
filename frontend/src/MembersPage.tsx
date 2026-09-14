import { useEffect, useMemo, useState } from 'react'
import { HomeMark } from './LoginPage'
import type { Household, Member } from './types'
import { AVATAR_EMOJIS, avatarEmoji, deriveColor, deriveInitials } from './types'
import {
  ApiError,
  getOrCreateInviteCode,
  removeGroupMember,
  leaveGroup,
  updateMemberRole,
  updateOwnDisplayTitle,
  updateCurrentUser,
  type GroupMemberResponse,
  type AuthUser,
  fetchActivities,
  type ActivityResponse,
  fetchGroupJoinRequests,
  approveGroupJoinRequest,
  rejectGroupJoinRequest,
  type GroupJoinRequestResponse,
} from './api'

type Props = {
  household: Household
  currentUserId: number | null
  onHome: () => void
  onBack: () => void
  onMemberRemoved: (userId: number) => void
  onMemberAdded: (member: Member) => void
  onLeaveHousehold: (groupId: number) => void
  onCurrentUserUpdated: (user: AuthUser) => void
  onMemberUpdated: (member: Member) => void
  onSelectMember: (member: Member) => void
}

const TITLE_PRESETS = [
  'Mom',
  'Dad',
  'Parent',
  'Child',
  'Sibling',
  'Roommate',
  'Housemate',
  'Home Owner',
  'Organizer',
  'Coordinator',
  'Team Lead',
  'Helper',
  'Member',
  'Chaos Coordinator',
] as const

function backendMemberToUpdatedMember(
  existing: Member,
  response: GroupMemberResponse,
): Member {
  return {
    ...existing,
    name: response.name,
    email: response.email,
    membershipId: response.membershipId,
    role: response.role,
    isAdmin: response.role === 'OWNER' || response.role === 'ADMIN',
    displayTitle: response.displayTitle ?? existing.displayTitle ?? 'Member',
  }
}

function todaySummary(member: Member): string {
  const total = member.todayChores ?? 0
  const completed = member.todayCompleted ?? 0

  if (total === 0) return 'No chores today'
  if (completed >= total) return `All ${total} chores done today`
  return `${completed} of ${total} chores done today`
}


function formatActivityTime(value: string): string {
  const date = new Date(value)
  const now = new Date()
  const minutes = Math.floor(Math.max(0, now.getTime() - date.getTime()) / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function activityText(activity: ActivityResponse): string {
  if (activity.type === 'CHORE_COMPLETED') {
    return `${activity.actorName} completed "${activity.choreTitle}"`
  }
  if (activity.type === 'CHORE_UNCOMPLETED') {
    return `${activity.actorName} marked "${activity.choreTitle}" incomplete`
  }
  return `${activity.actorName} created "${activity.choreTitle}"`
}

export default function MembersPage({
  household,
  currentUserId,
  onHome,
  onBack,
  onMemberRemoved,
  onMemberAdded,
  onLeaveHousehold,
  onCurrentUserUpdated,
  onMemberUpdated,
  onSelectMember,
}: Props) {
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [copied, setCopied] = useState(false)

  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileAvatar, setProfileAvatar] = useState('default')
  const [profileSaving, setProfileSaving] = useState(false)

  const [titleModalOpen, setTitleModalOpen] = useState(false)
  const [titleSelection, setTitleSelection] = useState('Member')
  const [customTitle, setCustomTitle] = useState('')
  const [titleSaving, setTitleSaving] = useState(false)

  const [memberRoleUpdatingId, setMemberRoleUpdatingId] =
    useState<number | null>(null)

  const [managementMember, setManagementMember] = useState<Member | null>(null)

  const [activities, setActivities] = useState<ActivityResponse[]>([])
  const [activityOpen, setActivityOpen] = useState(false)
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityError, setActivityError] = useState('')
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequestResponse[]>([])
  const [joinRequestError, setJoinRequestError] = useState('')
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null)
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null)

  const currentMember =
    household.members.find((member) => member.id === currentUserId) ?? null

  const currentUserIsOwner = household.ownerId === currentUserId

  useEffect(() => {
    if (!household.isAdmin) {
      setJoinRequests([])
      return
    }

    fetchGroupJoinRequests(household.id)
      .then(setJoinRequests)
      .catch((err) => setJoinRequestError(err instanceof ApiError ? err.message : 'Failed to load join requests'))
  }, [household.id, household.isAdmin])

  const handleApproveJoinRequest = async (request: GroupJoinRequestResponse) => {
    setProcessingRequestId(request.requestId)
    setJoinRequestError('')
    try {
      const response = await approveGroupJoinRequest(household.id, request.requestId)
      onMemberAdded({
        id: response.userId,
        membershipId: response.membershipId,
        name: response.name,
        email: response.email,
        initials: deriveInitials(response.name),
        points: 0,
        chores: 0,
        color: deriveColor(response.userId),
        isAdmin: false,
        role: response.role,
        displayTitle: response.displayTitle ?? 'Member',
        avatarKey: response.avatarKey,
        todayChores: 0,
        todayCompleted: 0,
      })
      setJoinRequests((current) => current.filter((item) => item.requestId !== request.requestId))
    } catch (err) {
      setJoinRequestError(err instanceof ApiError ? err.message : 'Failed to approve request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleRejectJoinRequest = async (request: GroupJoinRequestResponse) => {
    setProcessingRequestId(request.requestId)
    setJoinRequestError('')
    try {
      await rejectGroupJoinRequest(household.id, request.requestId)
      setJoinRequests((current) => current.filter((item) => item.requestId !== request.requestId))
    } catch (err) {
      setJoinRequestError(err instanceof ApiError ? err.message : 'Failed to reject request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const roleOrder: Record<NonNullable<Member['role']>, number> = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
  }

  const sortedMembers = [...household.members].sort((a, b) => {
    const roleDifference =
      roleOrder[a.role ?? 'MEMBER'] - roleOrder[b.role ?? 'MEMBER']

    if (roleDifference !== 0) return roleDifference

    return a.name.localeCompare(b.name, undefined, {
      sensitivity: 'base',
    })
  })



  const activityStorageKey =
    currentUserId == null
      ? null
      : `activity:lastSeen:${currentUserId}:${household.id}`

  const lastSeenActivityAt = activityStorageKey
    ? localStorage.getItem(activityStorageKey)
    : null

  const newActivityCount = useMemo(() => {
    if (!lastSeenActivityAt) return activities.length

    const lastSeenTime = new Date(lastSeenActivityAt).getTime()

    return activities.filter(
      (activity) => new Date(activity.createdAt).getTime() > lastSeenTime,
    ).length
  }, [activities, lastSeenActivityAt])

  useEffect(() => {
    let cancelled = false

    fetchActivities(household.id)
      .then((data) => {
        if (!cancelled) setActivities(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setActivityError(
            err instanceof ApiError
              ? err.message
              : 'Failed to load activity history',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [household.id])

  const handleToggleActivity = async () => {
    const nextOpen = !activityOpen
    setActivityOpen(nextOpen)

    if (!nextOpen) return

    setActivityError('')

    try {
      const data = await fetchActivities(household.id)
      setActivities(data)

      const newest = data[0]?.createdAt
      if (activityStorageKey && newest) {
        localStorage.setItem(activityStorageKey, newest)
      }
    } catch (err) {
      setActivityError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load activity history',
      )
    }
  }

  const handleShowInviteCode = async () => {
    setInviteModalOpen(true)
    setInviteError('')
    setCopied(false)

    if (inviteCode) return

    setInviteLoading(true)
    try {
      const response = await getOrCreateInviteCode(household.id)
      setInviteCode(response.inviteCode)
    } catch (err) {
      setInviteError(
        err instanceof ApiError ? err.message : 'Failed to load invite code',
      )
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCopyInviteCode = async () => {
    if (!inviteCode) return

    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setInviteError('Could not copy invite code')
    }
  }

  const handleRemoveMember = async (member: Member) => {
    if (!window.confirm(`Remove ${member.name} from this household?`)) return

    try {
      await removeGroupMember(household.id, member.id)
      onMemberRemoved(member.id)
    } catch (err) {
      window.alert(
        err instanceof ApiError ? err.message : 'Failed to remove member',
      )
    }
  }

  const handleLeaveHousehold = async () => {
    if (!window.confirm(`Leave ${household.name}?`)) return
    try {
      await leaveGroup(household.id)
      onLeaveHousehold(household.id)
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Failed to leave household')
    }
  }

  const openProfileModal = () => {
    if (!currentMember) return

    setProfileName(currentMember.name)
    setProfileAvatar(currentMember.avatarKey || 'default')
    setProfileModalOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!currentMember) return

    const normalizedName = profileName.trim()

    if (!normalizedName) {
      window.alert('Name cannot be blank.')
      return
    }

    if (normalizedName.length > 80) {
      window.alert('Name must be at most 80 characters.')
      return
    }

    setProfileSaving(true)

    try {
      const user = await updateCurrentUser({
        name: normalizedName,
        avatarKey: profileAvatar,
      })

      onCurrentUserUpdated(user)

      onMemberUpdated({
        ...currentMember,
        name: user.name,
        initials: deriveInitials(user.name),
        avatarKey: user.avatarKey,
      })

      setProfileModalOpen(false)
    } catch (err) {
      window.alert(
        err instanceof ApiError ? err.message : 'Failed to update profile',
      )
    } finally {
      setProfileSaving(false)
    }
  }

  const openTitleModal = () => {
    if (!currentMember) return

    const currentTitle = currentMember.displayTitle?.trim() || 'Member'
    const isPreset = TITLE_PRESETS.some((title) => title === currentTitle)

    setTitleSelection(isPreset ? currentTitle : 'Custom...')
    setCustomTitle(isPreset ? '' : currentTitle)
    setTitleModalOpen(true)
  }

  const handleSaveDisplayTitle = async () => {
    if (!currentMember) return

    const nextTitle =
      titleSelection === 'Custom...' ? customTitle.trim() : titleSelection

    if (!nextTitle) {
      window.alert('Please enter a title.')
      return
    }

    if (nextTitle.length > 40) {
      window.alert('Title must be at most 40 characters.')
      return
    }

    setTitleSaving(true)

    try {
      const response = await updateOwnDisplayTitle(household.id, nextTitle)
      onMemberUpdated(
        backendMemberToUpdatedMember(currentMember, response),
      )
      setTitleModalOpen(false)
    } catch (err) {
      window.alert(
        err instanceof ApiError ? err.message : 'Failed to update title',
      )
    } finally {
      setTitleSaving(false)
    }
  }

  const handleToggleManagement = async (member: Member) => {
    if (member.role === 'OWNER') return

    const nextRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'

    setMemberRoleUpdatingId(member.id)

    try {
      const response = await updateMemberRole(
        household.id,
        member.id,
        nextRole,
      )

      onMemberUpdated(
        backendMemberToUpdatedMember(member, response),
      )

      setManagementMember(null)
    } catch (err) {
      window.alert(
        err instanceof ApiError
          ? err.message
          : 'Failed to update member permissions',
      )
    } finally {
      setMemberRoleUpdatingId(null)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
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

        <div className="household-chip">
          <span>{household.emoji}</span>{household.name}
        </div>
      </header>

      <section className="page-content members-content">
        <button className="back-button" type="button" onClick={onBack}>
          ← All households
        </button>

        <div className="page-heading members-heading">
          <div>
            <span className="eyebrow">Household overview</span>
            <h1>Members</h1>
            <p>
              See today's workload, open your chores, and check how everyone is
              doing.
            </p>
          </div>

          <div className="members-heading-actions">
            <button className="member-secondary-action" type="button" onClick={handleLeaveHousehold}>Leave household</button>
            {household.isAdmin && (
              <button
                className="invite-code-button"
                type="button"
                onClick={handleShowInviteCode}
              >
                🔑 Invite code
              </button>
            )}

            <div className="members-count">
              <strong>{household.members.length}</strong>
              <span>members</span>
            </div>
          </div>
        </div>

        {household.isAdmin && (
          <section className="join-requests-panel">
            <div className="join-requests-heading">
              <div><span className="eyebrow">Approval required</span><h2>Join requests</h2></div>
              {joinRequests.length > 0 && <span className="join-request-count">{joinRequests.length}</span>}
            </div>
            {joinRequestError && <p className="form-message error-message" role="alert">{joinRequestError}</p>}
            {!joinRequestError && joinRequests.length === 0 && <p className="join-requests-empty">No pending requests.</p>}
            {joinRequests.map((request) => (
              <div className="join-request-row" key={request.requestId}>
                <div><strong>{request.name}</strong><small>{request.email}</small></div>
                <div>
                  <button className="member-secondary-action" type="button" disabled={processingRequestId === request.requestId} onClick={() => handleRejectJoinRequest(request)}>Reject</button>
                  <button className="submit-button" type="button" disabled={processingRequestId === request.requestId} onClick={() => handleApproveJoinRequest(request)}>Approve</button>
                </div>
              </div>
            ))}
          </section>
        )}


        <section className={`activity-history ${activityOpen ? 'open' : ''}`}>
          <button
            className="activity-history-toggle"
            type="button"
            onClick={handleToggleActivity}
            aria-expanded={activityOpen}
          >
            <span className="activity-history-title">
              <span className="activity-history-icon">◷</span>
              <strong>Activity history</strong>
            </span>

            <span className="activity-history-meta">
              {!activityOpen && newActivityCount > 0 && (
                <span className="activity-new-badge">{newActivityCount} new</span>
              )}
              <span className="activity-chevron" aria-hidden="true">
                {activityOpen ? '▴' : '▾'}
              </span>
            </span>
          </button>

          {activityOpen && (
            <div className="activity-history-panel">
              {activityLoading && (
                <p className="activity-history-message">Loading activity...</p>
              )}

              {!activityLoading && activityError && (
                <p className="activity-history-message activity-history-error" role="alert">
                  {activityError}
                </p>
              )}

              {!activityLoading && !activityError && activities.length === 0 && (
                <p className="activity-history-message">No activity yet.</p>
              )}

              {!activityLoading && !activityError && activities.length > 0 && (
                <div className="activity-history-list">
                  {activities.map((activity) => (
                    <div className="activity-history-item" key={activity.id}>
                      <span
                        className={`activity-type-icon ${
                          activity.type === 'CHORE_COMPLETED'
                            ? 'completed'
                            : activity.type === 'CHORE_UNCOMPLETED'
                              ? 'uncompleted'
                              : 'created'
                        }`}
                      >
                        {activity.type === 'CHORE_COMPLETED'
                          ? '✓'
                          : activity.type === 'CHORE_UNCOMPLETED'
                            ? '↶'
                            : '+'}
                      </span>

                      <span className="activity-history-copy">
                        <strong>{activityText(activity)}</strong>
                        <small>{formatActivityTime(activity.createdAt)}</small>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <div className="members-list">
          {household.members.length === 0 && (
            <div className="empty-state">
              <span>👥</span>
              <h3>No members yet</h3>
              <p>
                Members will appear here once they've been added to this
                household.
              </p>
            </div>
          )}

          {sortedMembers.map((member) => {
            const isCurrentUser = member.id === currentUserId
            const canOpen = household.isAdmin || isCurrentUser

            const canKick =
              household.isAdmin &&
              member.role !== 'OWNER' &&
              !isCurrentUser &&
              (currentUserIsOwner || member.role === 'MEMBER')

            const canChangeManagement =
              currentUserIsOwner &&
              member.role !== 'OWNER' &&
              !isCurrentUser

            const isUpdatingRole = memberRoleUpdatingId === member.id
            const displayTitle = member.displayTitle?.trim() || 'Member'
            const selectedAvatar = avatarEmoji(member.avatarKey)

            return (
              <article
                key={member.id}
                className={`member-row ${isCurrentUser ? 'member-row-self' : ''}`}
              >
                <button
                  className={`member-card ${
                    !canOpen ? 'member-card-locked' : ''
                  }`}
                  type="button"
                  onClick={() => canOpen && onSelectMember(member)}
                  disabled={!canOpen}
                >
                  <span
                    className={`member-avatar ${selectedAvatar ? 'emoji-avatar' : ''}`}
                    style={{ background: selectedAvatar ? '#fff' : member.color }}
                  >
                    {selectedAvatar ?? member.initials}
                  </span>

                  <span className="member-info">
                    <span>
                      <strong>{member.name}</strong>
                      {isCurrentUser && <span className="you-tag">You</span>}
                      {member.role === 'OWNER' && <span className="role-tag owner-role-tag">Owner</span>}
                      {member.role === 'ADMIN' && <span className="role-tag admin-role-tag">Admin</span>}
                    </span>

                    <small className="member-title-line">
                      {displayTitle}
                    </small>

                    <small className="member-today-line">
                      {todaySummary(member)}
                    </small>

                    <span className="member-card-cta">
                      {canOpen
                        ? isCurrentUser
                          ? 'View my chores →'
                          : 'View chores →'
                        : 'Chores are private 🔒'}
                    </span>
                  </span>

                  <span className="member-points">
                    <strong>★ {member.points}</strong>
                    <small>{member.chores} total chores</small>
                  </span>
                </button>

                <div className="member-row-actions">
                  {isCurrentUser && (
                    <>
                      <button
                        className="member-secondary-action"
                        type="button"
                        onClick={openTitleModal}
                      >
                        Change title
                      </button>

                      <button
                        className="member-secondary-action"
                        type="button"
                        onClick={openProfileModal}
                      >
                        Edit profile
                      </button>
                    </>
                  )}

                  {canChangeManagement && (
                    <div className="member-action-menu-wrap">
                      <button className="member-more-button" type="button" aria-label={`Actions for ${member.name}`} onClick={() => setOpenActionMenuId((current) => current === member.id ? null : member.id)}>⋯</button>
                      {openActionMenuId === member.id && (
                        <div className="member-action-menu">
                          <button type="button" disabled={isUpdatingRole} onClick={() => { setOpenActionMenuId(null); void handleToggleManagement(member) }}>{member.role === 'ADMIN' ? 'Remove admin role' : 'Make admin'}</button>
                          <button className="danger" type="button" onClick={() => { setOpenActionMenuId(null); void handleRemoveMember(member) }}>Remove</button>
                        </div>
                      )}
                    </div>
                  )}

                  {!currentUserIsOwner && canKick && (
                    <button
                      className="member-danger-action"
                      type="button"
                      onClick={() => handleRemoveMember(member)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {profileModalOpen && currentMember && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !profileSaving && setProfileModalOpen(false)}
        >
          <section
            className="modal profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-heading"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              disabled={profileSaving}
              onClick={() => setProfileModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            <span className="modal-icon">👤</span>
            <h2 id="profile-modal-heading">Edit profile</h2>
            <p>Your name and avatar are shared across all households.</p>

            <label className="title-modal-label">
              Display name
              <input
                className="title-modal-control"
                value={profileName}
                maxLength={80}
                onChange={(event) => setProfileName(event.target.value)}
              />
            </label>

            <div className="profile-avatar-section">
              <strong>Choose avatar</strong>
              <div className="profile-avatar-grid">
                {Object.entries(AVATAR_EMOJIS).map(([key, emoji]) => (
                  <button
                    key={key}
                    className={`profile-avatar-option ${
                      profileAvatar === key ? 'selected' : ''
                    }`}
                    type="button"
                    onClick={() => setProfileAvatar(key)}
                    aria-label={`Choose ${key} avatar`}
                    title={key}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="title-modal-actions">
              <button
                className="member-secondary-action"
                type="button"
                disabled={profileSaving}
                onClick={() => setProfileModalOpen(false)}
              >
                Cancel
              </button>

              <button
                className="submit-button"
                type="button"
                disabled={profileSaving}
                onClick={handleSaveProfile}
              >
                {profileSaving ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </section>
        </div>
      )}

      {managementMember && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            memberRoleUpdatingId === null && setManagementMember(null)
          }
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="management-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              disabled={memberRoleUpdatingId !== null}
              onClick={() => setManagementMember(null)}
              aria-label="Close"
            >
              ×
            </button>

            <span className="modal-icon">
              {managementMember.role === 'ADMIN' ? '🔐' : '🛠️'}
            </span>

            <h2 id="management-modal-title">
              {managementMember.role === 'ADMIN'
                ? 'Remove management permissions?'
                : 'Grant management permissions?'}
            </h2>

            <p>
              {managementMember.role === 'ADMIN'
                ? `${managementMember.name} will return to regular member access.`
                : `${managementMember.name} will be able to help manage this household.`}
            </p>

            {managementMember.role !== 'ADMIN' && (
              <div
                style={{
                  textAlign: 'left',
                  marginTop: '1rem',
                  lineHeight: 1.7,
                }}
              >
                <strong>They will be able to:</strong>
                <ul style={{ marginTop: '0.5rem' }}>
                  <li>Create and edit chores</li>
                  <li>Manage regular members</li>
                  <li>View member dashboards</li>
                </ul>
              </div>
            )}

            <div className="title-modal-actions">
              <button
                className="member-secondary-action"
                type="button"
                disabled={memberRoleUpdatingId !== null}
                onClick={() => setManagementMember(null)}
              >
                Cancel
              </button>

              <button
                className="submit-button"
                type="button"
                disabled={memberRoleUpdatingId !== null}
                onClick={() => handleToggleManagement(managementMember)}
              >
                {memberRoleUpdatingId === managementMember.id
                  ? 'Updating...'
                  : managementMember.role === 'ADMIN'
                    ? 'Remove management'
                    : 'Grant management'}
              </button>
            </div>
          </section>
        </div>
      )}

      {titleModalOpen && currentMember && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !titleSaving && setTitleModalOpen(false)}
        >
          <section
            className="modal title-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="title-modal-heading"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              disabled={titleSaving}
              onClick={() => setTitleModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            <span className="modal-icon">🏷️</span>
            <h2 id="title-modal-heading">Change your title</h2>
            <p>
              Choose how other people in {household.name} see you.
            </p>

            <label className="title-modal-label">
              Household title
              <select
                className="title-modal-control"
                value={titleSelection}
                onChange={(event) => setTitleSelection(event.target.value)}
              >
                {TITLE_PRESETS.map((title) => (
                  <option key={title} value={title}>{title}</option>
                ))}
                <option value="Custom...">Custom...</option>
              </select>
            </label>

            {titleSelection === 'Custom...' && (
              <label className="title-modal-label">
                Custom title
                <input
                  className="title-modal-control"
                  value={customTitle}
                  maxLength={40}
                  autoFocus
                  placeholder="e.g. Supreme Dishwasher"
                  onChange={(event) => setCustomTitle(event.target.value)}
                />
              </label>
            )}

            <div className="title-modal-actions">
              <button
                className="member-secondary-action"
                type="button"
                disabled={titleSaving}
                onClick={() => setTitleModalOpen(false)}
              >
                Cancel
              </button>

              <button
                className="submit-button"
                type="button"
                disabled={titleSaving}
                onClick={handleSaveDisplayTitle}
              >
                {titleSaving ? 'Saving...' : 'Save title'}
              </button>
            </div>
          </section>
        </div>
      )}

      {inviteModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setInviteModalOpen(false)}
        >
          <section
            className="modal invite-code-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-code-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setInviteModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            <span className="modal-icon">🔑</span>
            <h2 id="invite-code-title">Household invite code</h2>
            <p>
              Share this code with someone you want to invite to{' '}
              {household.name}.
            </p>

            {inviteLoading ? (
              <div className="invite-code-loading">
                Loading invite code...
              </div>
            ) : inviteError ? (
              <p className="form-message error-message" role="alert">
                {inviteError}
              </p>
            ) : (
              <>
                <div className="invite-code-display">{inviteCode}</div>
                <button
                  className="submit-button invite-copy-button"
                  type="button"
                  onClick={handleCopyInviteCode}
                >
                  {copied ? 'Copied ✓' : 'Copy invite code'}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
