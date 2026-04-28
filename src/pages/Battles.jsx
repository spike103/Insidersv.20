import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import {
  fetchMyBattles,
  createBattle,
  acceptBattle,
  rejectBattle,
} from '../lib/social.js'

export default function Battles() {
  const navigate = useNavigate()
  const { user, friends } = useApp()
  const [battles, setBattles] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active') // 'active' | 'pending' | 'history'
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const loadBattles = async () => {
    if (!user?.id) return
    const data = await fetchMyBattles(user.id)
    setBattles(data)
    setLoading(false)
  }

  useEffect(() => { loadBattles() }, [user?.id])

  const handleChallenge = async (opponentId, stake) => {
    if (!user?.id || !opponentId) return
    const res = await createBattle(user.id, opponentId, { stake })
    if (res.ok) {
      setShowChallengeModal(false)
      setFeedback({ kind: 'success', text: 'Défi envoyé !' })
      setTimeout(() => setFeedback(null), 2500)
      loadBattles()
    } else {
      setFeedback({ kind: 'error', text: res.error || 'Erreur' })
      setTimeout(() => setFeedback(null), 2500)
    }
  }

  const handleAccept = async (battleId) => {
    await acceptBattle(battleId, user.id)
    loadBattles()
  }

  const handleReject = async (battleId) => {
    if (!confirm('Refuser ce défi ?')) return
    await rejectBattle(battleId, user.id)
    loadBattles()
  }

  const filtered = battles.filter(b => {
    if (tab === 'active') return b.status === 'active'
    if (tab === 'pending') return b.status === 'pending'
    if (tab === 'history') return b.status === 'computed' || b.status === 'rejected'
    return true
  })

  return (
    <>
      <TopBar showBack title="Battles" />
      <div className="px-5 pt-2 pb-28">

        {/* Header explicatif */}
        <div className="card mb-4 p-4" style={{
          background: 'rgba(239,68,68,0.06)',
          borderColor: 'rgba(239,68,68,0.3)',
        }}>
          <div className="flex items-start gap-3">
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(239,68,68,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name="crown" size={18} color="loss" />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--loss-500)' }}>
                Battles 1v1
              </div>
              <div className="caption mt-1" style={{ fontSize: 12 }}>
                Défie un ami sur la semaine. Le meilleur ROI gagne. Le perdant paie 10 crédits.
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="card p-3 mb-3 animate-slide-up" style={{
            background: feedback.kind === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            borderColor: feedback.kind === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
            color: feedback.kind === 'success' ? 'var(--win-500)' : 'var(--loss-500)',
            fontWeight: 700,
            fontSize: 13,
            textAlign: 'center',
          }}>
            {feedback.text}
          </div>
        )}

        {/* Bouton défier */}
        <button
          onClick={() => setShowChallengeModal(true)}
          className="btn-primary mb-4"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Icon name="add" size={14} color="white" />
          Défier un ami
        </button>

        {/* Tabs */}
        <div className="segmented mb-4">
          <button onClick={() => setTab('active')}  className={`seg-btn ${tab === 'active'  ? 'active' : ''}`}>En cours</button>
          <button onClick={() => setTab('pending')} className={`seg-btn ${tab === 'pending' ? 'active' : ''}`}>Invitations</button>
          <button onClick={() => setTab('history')} className={`seg-btn ${tab === 'history' ? 'active' : ''}`}>Historique</button>
        </div>

        {loading ? (
          <div className="card p-6 text-center"><div className="caption">Chargement…</div></div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <div style={{
              width: 56, height: 56, margin: '0 auto 16px', borderRadius: 16,
              background: 'var(--ink-700)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="crown" size={26} color="muted" />
            </div>
            <h3 className="h3 mb-1">Aucune battle</h3>
            <p className="body" style={{ fontSize: 13 }}>
              {tab === 'active' && 'Aucun duel en cours. Lance-toi !'}
              {tab === 'pending' && 'Aucune invitation reçue.'}
              {tab === 'history' && 'Pas encore de battles terminées.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(b => (
              <BattleCard
                key={b.id}
                battle={b}
                userId={user.id}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>

      {showChallengeModal && (
        <ChallengeModal
          friends={friends || []}
          onChallenge={handleChallenge}
          onClose={() => setShowChallengeModal(false)}
        />
      )}
    </>
  )
}

function BattleCard({ battle, userId, onAccept, onReject }) {
  const isChallenger = battle.challenger_id === userId
  const me = isChallenger ? battle.challenger : battle.opponent
  const them = isChallenger ? battle.opponent : battle.challenger

  if (!them) return null

  const themInitials = (them.first_name?.slice(0,1) || them.username?.slice(0,1) || '?').toUpperCase() +
    (them.last_name?.slice(0,1) || '').toUpperCase()
  const meInitials = (me?.first_name?.slice(0,1) || me?.username?.slice(0,1) || '?').toUpperCase() +
    (me?.last_name?.slice(0,1) || '').toUpperCase()

  const myValue = isChallenger ? battle.challenger_value : battle.opponent_value
  const themValue = isChallenger ? battle.opponent_value : battle.challenger_value

  // Status badge
  let statusLabel = ''
  let statusColor = 'var(--fg-3)'
  let statusBg = 'var(--ink-700)'
  if (battle.status === 'pending') {
    statusLabel = isChallenger ? 'En attente' : 'À accepter'
    statusColor = 'var(--gold-400)'
    statusBg = 'rgba(240,200,90,0.15)'
  } else if (battle.status === 'active') {
    statusLabel = 'En cours'
    statusColor = 'var(--blue-500)'
    statusBg = 'rgba(41,98,255,0.15)'
  } else if (battle.status === 'computed') {
    if (battle.winner_id === userId) {
      statusLabel = 'Victoire'
      statusColor = 'var(--win-500)'
      statusBg = 'rgba(34,197,94,0.15)'
    } else {
      statusLabel = 'Défaite'
      statusColor = 'var(--loss-500)'
      statusBg = 'rgba(239,68,68,0.15)'
    }
  } else if (battle.status === 'rejected') {
    statusLabel = 'Refusée'
  }

  // Compteur temps restant
  const ends = new Date(battle.ends_at).getTime()
  const now = Date.now()
  const remaining = Math.max(0, ends - now)
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

  return (
    <div className="card p-4">
      {/* Header status */}
      <div className="flex items-center justify-between mb-3">
        <div style={{
          padding: '4px 10px', borderRadius: 999,
          background: statusBg, color: statusColor,
          fontSize: 10, fontWeight: 800,
          letterSpacing: '0.1em',
          fontFamily: 'Archivo Black, sans-serif',
        }}>
          {statusLabel.toUpperCase()}
        </div>
        {battle.status === 'active' && (
          <div className="caption" style={{ fontSize: 10 }}>
            {days > 0 ? `${days}j ${hours}h` : `${hours}h restantes`}
          </div>
        )}
      </div>

      {/* Versus */}
      <div className="flex items-center gap-2">
        {/* Moi */}
        <div className="flex-1 text-center">
          <Avatar avatarKey={me?.avatar_key} initials={meInitials} size={48} />
          <div style={{ fontSize: 12, fontWeight: 800, marginTop: 6 }}>Toi</div>
          {battle.status !== 'pending' && (
            <div style={{
              fontFamily: 'Archivo Black, sans-serif',
              fontSize: 18, fontWeight: 900, marginTop: 4,
              color: myValue >= 0 ? 'var(--win-500)' : 'var(--loss-500)',
            }}>
              {Number(myValue) >= 0 ? '+' : ''}{Number(myValue || 0).toFixed(1)}%
            </div>
          )}
        </div>

        {/* VS */}
        <div style={{
          fontFamily: 'Archivo Black, sans-serif',
          fontSize: 22, fontWeight: 900,
          color: 'var(--fg-3)',
          fontStyle: 'italic',
          padding: '0 8px',
        }}>
          VS
        </div>

        {/* Eux */}
        <div className="flex-1 text-center">
          <Avatar avatarKey={them.avatar_key} initials={themInitials} size={48} />
          <div style={{ fontSize: 12, fontWeight: 800, marginTop: 6 }}>@{them.username}</div>
          {battle.status !== 'pending' && (
            <div style={{
              fontFamily: 'Archivo Black, sans-serif',
              fontSize: 18, fontWeight: 900, marginTop: 4,
              color: themValue >= 0 ? 'var(--win-500)' : 'var(--loss-500)',
            }}>
              {Number(themValue) >= 0 ? '+' : ''}{Number(themValue || 0).toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {/* Stake */}
      <div className="flex items-center justify-center gap-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--ink-700)' }}>
        <Icon name="crown" size={12} color="gold" />
        <span style={{ fontSize: 11, fontWeight: 700 }}>
          {battle.stake} crédits en jeu
        </span>
      </div>

      {/* Actions pour pending opponent */}
      {battle.status === 'pending' && !isChallenger && (
        <div className="flex gap-2 mt-3">
          <button onClick={() => onReject(battle.id)} className="btn-ghost" style={{ flex: 1 }}>
            Refuser
          </button>
          <button onClick={() => onAccept(battle.id)} className="btn-primary" style={{ flex: 2 }}>
            Accepter
          </button>
        </div>
      )}
    </div>
  )
}

function ChallengeModal({ friends, onChallenge, onClose }) {
  const [selectedFriendId, setSelectedFriendId] = useState(null)
  const [stake, setStake] = useState(10)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />
      <div
        className="relative w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--ink-900)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 20, paddingBottom: 36,
          maxHeight: '85vh', overflowY: 'auto',
          border: '1px solid var(--ink-600)',
          borderBottom: 'none',
        }}
      >
        <h3 className="h3 mb-4">Défier un ami</h3>

        {friends.length === 0 ? (
          <div className="card p-6 text-center mb-4">
            <div className="caption">Tu n'as pas encore d'amis. Va dans Friends pour en ajouter.</div>
          </div>
        ) : (
          <>
            <div className="caption mb-3" style={{ fontSize: 12 }}>
              Choisis un ami à défier sur 7 jours.
            </div>
            <div className="space-y-2 mb-4">
              {friends.map(f => {
                const initials = (f.first_name?.slice(0,1) || f.username?.slice(0,1) || '?').toUpperCase() +
                  (f.last_name?.slice(0,1) || '').toUpperCase()
                const selected = selectedFriendId === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFriendId(f.id)}
                    className="w-full text-left p-3 flex items-center gap-3"
                    style={{
                      borderRadius: 12,
                      background: selected ? 'rgba(41,98,255,0.12)' : 'var(--ink-800)',
                      border: selected ? '1.5px solid var(--blue-500)' : '1px solid var(--ink-600)',
                      cursor: 'pointer',
                    }}
                  >
                    <Avatar user={f} initials={initials} size={36} />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 13, fontWeight: 700 }}>@{f.username}</div>
                      {f.first_name && (
                        <div className="caption" style={{ fontSize: 11 }}>{f.first_name} {f.last_name}</div>
                      )}
                    </div>
                    {selected && (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--blue-500)" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M 5 12 l 5 5 l 9 -10" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mb-4">
              <label className="field-label">Mise (crédits)</label>
              <div className="flex gap-2">
                {[5, 10, 20, 50].map(s => (
                  <button
                    key={s}
                    onClick={() => setStake(s)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 12,
                      background: stake === s ? 'var(--blue-500)' : 'var(--ink-800)',
                      border: stake === s ? '1.5px solid var(--blue-500)' : '1px solid var(--ink-600)',
                      color: stake === s ? 'white' : 'var(--fg-1)',
                      fontFamily: 'Archivo Black, sans-serif',
                      fontSize: 14, fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>
            Annuler
          </button>
          <button
            onClick={() => onChallenge(selectedFriendId, stake)}
            disabled={!selectedFriendId}
            className="btn-primary"
            style={{ flex: 2, opacity: selectedFriendId ? 1 : 0.5 }}
          >
            Envoyer le défi
          </button>
        </div>
      </div>
    </div>
  )
}
