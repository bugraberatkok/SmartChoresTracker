import { HomeMark } from './LoginPage'
import type { Household, Member } from './types'

type Props = {
  household: Household
  currentUserName: string
  onBack: () => void
  onSelectMember: (member: Member) => void
}

export default function MembersPage({ household, currentUserName, onBack, onSelectMember }: Props) {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark"><HomeMark /></span><span>Smart Chores</span></div>
        <div className="household-chip"><span>{household.emoji}</span>{household.name}</div>
      </header>
      <section className="page-content members-content">
        <button className="back-button" type="button" onClick={onBack}>← All households</button>
        <div className="page-heading members-heading"><div><span className="eyebrow">Household overview</span><h1>Members</h1><p>See everyone in {household.name} and how they're doing.</p></div><div className="members-count"><strong>{household.members.length}</strong><span>members</span></div></div>
        <div className="members-list">
          {household.members.length === 0 && (
            <div className="empty-state">
              <span>👥</span>
              <h3>No members yet</h3>
              <p>Members will appear here once they've been added to this household.</p>
            </div>
          )}
          {household.members.map((member) => {
            const isCurrentUser = member.name === currentUserName
            const canOpen = household.isAdmin || isCurrentUser

            return (
            <button className={`member-card ${!canOpen ? 'member-card-locked' : ''}`} key={member.id} type="button" onClick={() => canOpen && onSelectMember(member)} disabled={!canOpen}>
              <span className="member-avatar" style={{ background: member.color }}>{member.initials}</span>
              <span className="member-info"><span><strong>{member.name}</strong>{member.isAdmin && <span className="admin-tag">Admin</span>}{isCurrentUser && <span className="you-tag">You</span>}</span><small>{canOpen ? `${member.role ?? 'Member'}` : 'Chores are private'}</small></span>
              <span className="member-points"><strong>★ {member.points}</strong><small>points</small></span>
              <span className="card-arrow">{canOpen ? '→' : '🔒'}</span>
            </button>
          )})}
        </div>
      </section>
    </main>
  )
}
