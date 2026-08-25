import { useState } from 'react'
import type { FormEvent } from 'react'
import { HomeMark } from './LoginPage'
import type { Household } from './types'
import { deriveInitials } from './types'
import { createGroup, addGroupMember, ApiError, type AuthUser, type GroupResponse } from './api'

type Props = {
  households: Household[]
  currentUser: AuthUser | null
  loading: boolean
  onSelect: (household: Household) => void
  onGroupCreated: (group: GroupResponse) => void
  onLogout: () => void
}

export default function HouseholdsPage({ households, currentUser, loading, onSelect, onGroupCreated, onLogout }: Props) {
  const [dialog, setDialog] = useState<'create' | 'join' | null>(null)
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
    const groupId = Number(data.get('code'))
    const email = currentUser?.email ?? ''

    try {
      await addGroupMember(groupId, email)
      // Refresh will happen on next navigation; for now close dialog
      setDialog(null)
      // TODO: Could refetch groups here for immediate update
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to join household')
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
            <button className="household-card" type="button" key={household.id} onClick={() => onSelect(household)}>
              <span className="household-icon home">{household.emoji}</span>
              <span className="household-details"><span className="card-topline"><span>{household.name}</span>{household.isAdmin && <span className="admin-tag">Admin</span>}</span><strong>{household.name}</strong><small>{household.members.length} members</small></span>
              <span className="card-arrow">→</span>
            </button>
          ))}

          <button className="add-household-card" type="button" onClick={() => { setDialog('create'); setError('') }}><span className="plus-icon">+</span><strong>Create household</strong><small>Start a new shared space</small></button>
          <button className="add-household-card" type="button" onClick={() => { setDialog('join'); setError('') }}><span className="plus-icon">+</span><strong>Join a household</strong><small>Enter a group ID</small></button>
        </div>
      </section>

      {dialog && (
        <div className="modal-backdrop" onMouseDown={() => setDialog(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setDialog(null)} aria-label="Close">×</button>
            <span className="modal-icon">{dialog === 'create' ? '🏡' : '🔑'}</span>
            <h2 id="modal-title">{dialog === 'create' ? 'Create a household' : 'Join a household'}</h2>
            <p>{dialog === 'create' ? 'Give your shared space a name and an optional description.' : 'Enter the group ID provided by your household admin.'}</p>
            <form onSubmit={dialog === 'create' ? handleCreate : handleJoin}>
              {dialog === 'create' ? <>
                <label htmlFor="household-name">Household name</label>
                <input className="modal-input" id="household-name" name="name" placeholder="e.g. Green Street Home" required />
                <label htmlFor="household-desc">Description (optional)</label>
                <input className="modal-input" id="household-desc" name="description" placeholder="e.g. Our family home" />
              </> : <>
                <label htmlFor="household-code">Group ID</label>
                <input className="modal-input code-input" id="household-code" name="code" type="number" placeholder="e.g. 1" required />
              </>}
              {error && <p className="form-message error-message" role="alert">{error}</p>}
              <button className="submit-button" type="submit" disabled={submitting}>{dialog === 'create' ? 'Create household' : 'Join household'} <span>→</span></button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
