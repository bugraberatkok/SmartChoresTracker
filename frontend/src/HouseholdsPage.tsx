import { useState } from 'react'
import type { FormEvent } from 'react'
import { HomeMark } from './LoginPage'
import type { Household } from './types'
import { deriveInitials } from './types'
import { createGroup, joinGroupByCode, fetchGroups, updateGroup, deleteGroup, ApiError, type AuthUser, type GroupResponse } from './api'

type Props = {
  households: Household[]
  currentUser: AuthUser | null
  loading: boolean
  onSelect: (household: Household) => void
  onGroupCreated: (group: GroupResponse) => void
  onGroupUpdated: (group: GroupResponse) => void
  onGroupDeleted: (groupId: number) => void
  onLogout: () => void
}

export default function HouseholdsPage({ households, currentUser, loading, onSelect, onGroupCreated, onGroupUpdated, onGroupDeleted, onLogout }: Props) {
  const [dialog, setDialog] = useState<'create' | 'join' | null>(null)
  const [editingHousehold, setEditingHousehold] = useState<Household | null>(null)
  const [deletingHousehold, setDeletingHousehold] = useState<Household | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name'))
    const description = String(data.get('description') ?? '')

    try {
      const group = await createGroup(name, description)
      onGroupCreated(group)
      setDialog(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create household')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const data = new FormData(event.currentTarget)
    const inviteCode = String(data.get('code') ?? '').trim().toUpperCase()

    try {
      await joinGroupByCode(inviteCode)

      const groups = await fetchGroups()
      const joinedGroup = groups.find(
        (group) => !households.some((household) => household.id === group.id),
      )

      if (!joinedGroup) {
        throw new Error('Joined household could not be loaded')
      }

      onGroupCreated(joinedGroup)
      setDialog(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to join household')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingHousehold) return
    setError('')
    setSubmitting(true)
    const data = new FormData(event.currentTarget)

    try {
      const group = await updateGroup(editingHousehold.id, {
        name: String(data.get('name')),
        description: String(data.get('description') ?? ''),
      })
      onGroupUpdated(group)
      setEditingHousehold(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update household')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingHousehold) return
    setError('')
    setSubmitting(true)
    try {
      await deleteGroup(deletingHousehold.id)
      onGroupDeleted(deletingHousehold.id)
      setDeletingHousehold(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete household')
    } finally {
      setSubmitting(false)
    }
  }

  const userInitials = currentUser ? deriveInitials(currentUser.name) : '??'
  const userFirstName = currentUser?.name.split(' ')[0] ?? 'User'

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark"><HomeMark /></span><span>Smart Chores</span></div>
        <div className="user-menu"><span className="header-avatar">{userInitials}</span><span>{userFirstName}</span><button type="button" onClick={onLogout} aria-label="Sign out">↗</button></div>
      </header>

      <section className="page-content">
        <div className="page-heading">
          <div><span className="eyebrow">Your spaces</span><h1>Select a household</h1><p>Choose where you want to get things done today.</p></div>
          <div className="points-pill"><span>★</span><div><strong>{households.length}</strong><small>{households.length === 1 ? 'Household' : 'Households'}</small></div></div>
        </div>

        {loading && <p style={{ textAlign: 'center', opacity: 0.6, padding: '2rem' }}>Loading your households...</p>}

        <div className="household-grid">
          {households.map((household) => (
            <article className="household-card" key={household.id}>
              <button className="household-open-button" type="button" onClick={() => onSelect(household)}>
                <span className="household-icon home">{household.emoji}</span>
                <span className="household-details"><span className="card-topline"><span>{household.name}</span>{household.isAdmin && <span className="admin-tag">Admin</span>}</span><strong>{household.name}</strong><small>{household.members.length} {household.members.length === 1 ? 'member' : 'members'}</small></span>
              </button>
              {household.ownerId === currentUser?.id && <div className="household-card-actions">
                <button type="button" title="Change household info" aria-label={`Edit ${household.name}`} onClick={() => { setError(''); setEditingHousehold(household) }}>✎</button>
                <button type="button" title="Delete household" aria-label={`Delete ${household.name}`} onClick={() => { setError(''); setDeletingHousehold(household) }}>🗑</button>
              </div>}
            </article>
          ))}

          <button className="add-household-card" type="button" onClick={() => { setDialog('create'); setError('') }}><span className="plus-icon">+</span><strong>Create household</strong><small>Start a new shared space</small></button>
          <button className="add-household-card" type="button" onClick={() => { setDialog('join'); setError('') }}><span className="plus-icon">+</span><strong>Join a household</strong><small>Enter an invite code</small></button>
        </div>
      </section>

      {dialog && (
        <div className="modal-backdrop" onMouseDown={() => setDialog(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setDialog(null)} aria-label="Close">×</button>
            <span className="modal-icon">{dialog === 'create' ? '🏡' : '🔑'}</span>
            <h2 id="modal-title">{dialog === 'create' ? 'Create a household' : 'Join a household'}</h2>
            <p>{dialog === 'create' ? 'Give your shared space a name and an optional description.' : 'Enter the invite code provided by your household admin.'}</p>
            <form onSubmit={dialog === 'create' ? handleCreate : handleJoin}>
              {dialog === 'create' ? <>
                <label htmlFor="household-name">Household name</label>
                <input className="modal-input" id="household-name" name="name" placeholder="e.g. Green Street Home" required />
                <label htmlFor="household-desc">Description (optional)</label>
                <input className="modal-input" id="household-desc" name="description" placeholder="e.g. Our family home" />
              </> : <>
                <label htmlFor="household-code">Invite code</label>
                <input className="modal-input code-input" id="household-code" name="code" type="text" maxLength={12} placeholder="e.g. A7F3C9" autoCapitalize="characters" required />
              </>}
              {error && <p className="form-message error-message" role="alert">{error}</p>}
              <button className="submit-button" type="submit" disabled={submitting}>{dialog === 'create' ? 'Create household' : 'Join household'} <span>→</span></button>
            </form>
          </section>
        </div>
      )}


      {editingHousehold && (
        <div className="modal-backdrop" onMouseDown={() => setEditingHousehold(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-household-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setEditingHousehold(null)} aria-label="Close">×</button>
            <span className="modal-icon">✎</span>
            <h2 id="edit-household-title">Change household info</h2>
            <p>Update the household name or description.</p>
            <form onSubmit={handleUpdate}>
              <label htmlFor="edit-household-name">Household name</label>
              <input className="modal-input" id="edit-household-name" name="name" defaultValue={editingHousehold.name} required />
              <label htmlFor="edit-household-description">Description</label>
              <input className="modal-input" id="edit-household-description" name="description" defaultValue={editingHousehold.description ?? ''} />
              {error && <p className="form-message error-message" role="alert">{error}</p>}
              <button className="submit-button" type="submit" disabled={submitting}>Save changes</button>
            </form>
          </section>
        </div>
      )}

      {deletingHousehold && (
        <div className="modal-backdrop" onMouseDown={() => setDeletingHousehold(null)}>
          <section className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setDeletingHousehold(null)} aria-label="Close">×</button>
            <span className="modal-icon">🏚</span>
            <h2 id="confirm-delete-title">Delete household?</h2>
            <p>Are you sure you want to delete <strong>{deletingHousehold.name}</strong>? Its memberships and chores will be permanently deleted.</p>
            {error && <p className="form-message error-message" role="alert">{error}</p>}
            <div className="modal-row delete-actions">
              <button className="back-button" type="button" onClick={() => setDeletingHousehold(null)}>Cancel</button>
              <button className="submit-button danger-button" type="button" onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Yes, delete household'}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
