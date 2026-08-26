import { useState } from 'react'
import { HomeMark } from './LoginPage'
import type { Household, Member } from './types'
import { ApiError, deleteGroup, removeGroupMember } from './api'

type Props = {
  household: Household
  currentUserId: number | null
  onBack: () => void
  onHouseholdDeleted: () => void
  onMemberRemoved: (userId: number) => void
  onSelectMember: (member: Member) => void
}

export default function MembersPage({
  household,
  currentUserId,
  onBack,
  onHouseholdDeleted,
  onMemberRemoved,
  onSelectMember,
}: Props) {
  const [showDeleteHousehold, setShowDeleteHousehold] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDeleteHousehold = async () => {
    setDeleteError('')
    try {
      await deleteGroup(household.id)
      setShowDeleteHousehold(false)
      onHouseholdDeleted()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Failed to delete household')
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
        <div className="page-heading members-heading"><div><span className="eyebrow">Household overview</span><h1>Members</h1><p>See everyone in {household.name} and how they're doing.</p></div><div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}><div className="members-count"><strong>{household.members.length}</strong><span>members</span></div>{household.ownerId === currentUserId && <button type="button" onClick={() => { setDeleteError(''); setShowDeleteHousehold(true) }} style={{ border: '1px solid #c65a5a', borderRadius: '10px', padding: '0.65rem 0.9rem', background: 'transparent', cursor: 'pointer' }}>Delete household</button>}</div></div>
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

      {showDeleteHousehold && household.ownerId === currentUserId && (
        <div className="modal-backdrop" onMouseDown={() => setShowDeleteHousehold(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-household-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setShowDeleteHousehold(false)}>×</button>
            <span className="modal-icon">🏚</span>
            <h2 id="delete-household-title">Delete household?</h2>
            <p><strong>{household.name}</strong>, its memberships, and all chores inside it will be permanently deleted.</p>
            {deleteError && <p className="form-message error-message" role="alert">{deleteError}</p>}
            <div className="modal-row">
              <button className="back-button" type="button" onClick={() => setShowDeleteHousehold(false)}>Cancel</button>
              <button className="submit-button" type="button" onClick={handleDeleteHousehold}>Delete household</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
