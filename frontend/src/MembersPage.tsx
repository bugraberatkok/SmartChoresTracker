import { useState } from 'react'
import { HomeMark } from './LoginPage'
import type { Household, Member } from './types'
import { ApiError, removeGroupMember, getOrCreateInviteCode } from './api'

type Props = {
  household: Household
  currentUserId: number | null
  onBack: () => void
  onMemberRemoved: (userId: number) => void
  onSelectMember: (member: Member) => void
}

export default function MembersPage({
  household,
  currentUserId,
  onBack,
  onMemberRemoved,
  onSelectMember,
}: Props) {
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [copied, setCopied] = useState(false)

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
      window.alert(err instanceof ApiError ? err.message : 'Failed to remove member')
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark"><HomeMark /></span><span>Smart Chores</span></div>
        <div className="household-chip"><span>{household.emoji}</span>{household.name}</div>
      </header>
      <section className="page-content members-content">
        <button className="back-button" type="button" onClick={onBack}>← All households</button>
        <div className="page-heading members-heading">
          <div><span className="eyebrow">Household overview</span><h1>Members</h1><p>See everyone in {household.name} and how they're doing.</p></div>
          <div className="members-heading-actions">
            <button className="invite-code-button" type="button" onClick={handleShowInviteCode}>🔑 Invite code</button>
            <div className="members-count"><strong>{household.members.length}</strong><span>members</span></div>
          </div>
        </div>
        <div className="members-list">
          {household.members.length === 0 && (
            <div className="empty-state">
              <span>👥</span>
              <h3>No members yet</h3>
              <p>Members will appear here once they've been added to this household.</p>
            </div>
          )}
          {household.members.map((member) => {
            const isCurrentUser = member.id === currentUserId
            const canOpen = household.isAdmin || isCurrentUser

            const canKick =
              household.isAdmin &&
              member.role !== 'OWNER' &&
              !isCurrentUser

            return (
              <div key={member.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'stretch', width: '100%' }}>
                <button className={`member-card ${!canOpen ? 'member-card-locked' : ''}`} style={{ flex: 1 }} type="button" onClick={() => canOpen && onSelectMember(member)} disabled={!canOpen}>
                  <span className="member-avatar" style={{ background: member.color }}>{member.initials}</span>
                  <span className="member-info"><span><strong>{member.name}</strong>{member.isAdmin && <span className="admin-tag">Admin</span>}{isCurrentUser && <span className="you-tag">You</span>}</span><small>{canOpen ? `${member.role ?? 'Member'}` : 'Chores are private'}</small></span>
                  <span className="member-points"><strong>★ {member.points}</strong><small>{member.chores} chores</small></span>
                  <span className="card-arrow">{canOpen ? '→' : '🔒'}</span>
                </button>
                {canKick && <button type="button" onClick={() => handleRemoveMember(member)} style={{ border: '1px solid #c65a5a', borderRadius: '12px', padding: '0 0.9rem', background: 'transparent', cursor: 'pointer' }}>Kick</button>}
              </div>
            )
          })}
        </div>
      </section>

      {inviteModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setInviteModalOpen(false)}>
          <section className="modal invite-code-modal" role="dialog" aria-modal="true" aria-labelledby="invite-code-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setInviteModalOpen(false)} aria-label="Close">×</button>
            <span className="modal-icon">🔑</span>
            <h2 id="invite-code-title">Household invite code</h2>
            <p>Share this code with someone you want to invite to {household.name}.</p>
            {inviteLoading ? (
              <div className="invite-code-loading">Loading invite code...</div>
            ) : inviteError ? (
              <p className="form-message error-message" role="alert">{inviteError}</p>
            ) : (
              <>
                <div className="invite-code-display">{inviteCode}</div>
                <button className="submit-button invite-copy-button" type="button" onClick={handleCopyInviteCode}>
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
