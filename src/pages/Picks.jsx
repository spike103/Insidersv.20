import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import {
  fetchPublishedBets,
  fetchMyVotes,
  voteOnPublishedBet,
  publishBet,
  unpublishBet,
} from '../lib/social.js'

export default function Picks() {
  const navigate = useNavigate()
  const { user, bets } = useApp()
  const [picks, setPicks] = useState([])
  const [myVotes, setMyVotes] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const loadPicks = async () => {
    const data = await fetchPublishedBets(30)
    setPicks(data)
    if (user?.id) {
      setMyVotes(await fetchMyVotes(user.id))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPicks()
  }, [user?.id])

  const handleVote = async (publishedBetId, vote) => {
    if (!user?.id) return
    // Optimistic update
    const previous = myVotes.get(publishedBetId)
    const newVotes = new Map(myVotes)
    newVotes.set(publishedBetId, vote)
    setMyVotes(newVotes)
    setPicks(prev => prev.map(p => {
      if (p.id !== publishedBetId) return p
      let yes = p.votes_yes
      let no = p.votes_no
      if (previous === 'yes') yes -= 1
      if (previous === 'no') no -= 1
      if (vote === 'yes') yes += 1
      if (vote === 'no') no += 1
      return { ...p, votes_yes: yes, votes_no: no }
    }))
    const res = await voteOnPublishedBet(user.id, publishedBetId, vote)
    if (!res.ok) {
      // revert
      newVotes.set(publishedBetId, previous)
      setMyVotes(new Map(newVotes))
      loadPicks()
    }
  }

  const handlePublish = async (betId, caption) => {
    if (!user?.id || !betId) return
    const res = await publishBet(user.id, betId, caption)
    if (res.ok) {
      setShowPublishModal(false)
      setFeedback({ kind: 'success', text: 'Pari publié sur le feed !' })
      setTimeout(() => setFeedback(null), 2500)
      loadPicks()
    } else if (res.error === 'already_published') {
      setFeedback({ kind: 'error', text: 'Ce pari est déjà publié' })
      setTimeout(() => setFeedback(null), 2500)
    } else {
      setFeedback({ kind: 'error', text: 'Erreur lors de la publication' })
      setTimeout(() => setFeedback(null), 2500)
    }
  }

  const handleUnpublish = async (publishedBetId) => {
    if (!confirm('Retirer ce pari du feed ?')) return
    await unpublishBet(user.id, publishedBetId)
    loadPicks()
  }

  const myPendingBets = (bets || []).filter(b => b.status === 'pending')
  const alreadyPublishedBetIds = new Set(picks.filter(p => p.user_id === user?.id).map(p => p.bet_id))
  const publishableBets = myPendingBets.filter(b => !alreadyPublishedBetIds.has(b.id))

  return (
    <>
      <TopBar showBack title="Picks" />
      <div className="px-5 pt-2 pb-28">

        {/* Header explicatif */}
        <div className="card mb-4 p-4" style={{
          background: 'rgba(41,98,255,0.06)',
          borderColor: 'rgba(41,98,255,0.3)',
        }}>
          <div className="flex items-start gap-3">
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(41,98,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name="sparkle" size={18} color="blue" />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue-500)' }}>
                Le mur des picks
              </div>
              <div className="caption mt-1" style={{ fontSize: 12 }}>
                Publie un pari pending et reçois des votes ✓ ou ✗ de la communauté.
                Si tu gagnes, tu reçois <strong>+1 crédit par vote ✓</strong>.
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

        {/* Bouton publier */}
        {publishableBets.length > 0 && (
          <button
            onClick={() => setShowPublishModal(true)}
            className="btn-primary mb-4"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Icon name="add" size={14} color="white" />
            Publier un de mes paris
          </button>
        )}

        {/* Feed des picks */}
        <h3 className="h3 mb-3">Feed des picks</h3>

        {loading ? (
          <div className="card p-6 text-center">
            <div className="caption">Chargement…</div>
          </div>
        ) : picks.length === 0 ? (
          <div className="card p-8 text-center">
            <div style={{
              width: 56, height: 56, margin: '0 auto 16px', borderRadius: 16,
              background: 'var(--ink-700)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="sparkle" size={26} color="muted" />
            </div>
            <h3 className="h3 mb-1">Aucun pick publié</h3>
            <p className="body" style={{ fontSize: 13 }}>
              Sois le premier à partager un pari avec la communauté.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {picks.map(p => (
              <PickCard
                key={p.id}
                pick={p}
                myVote={myVotes.get(p.id)}
                onVote={handleVote}
                onUnpublish={handleUnpublish}
                isMe={p.user_id === user?.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal publier */}
      {showPublishModal && (
        <PublishModal
          bets={publishableBets}
          onPublish={handlePublish}
          onClose={() => setShowPublishModal(false)}
        />
      )}
    </>
  )
}

function PickCard({ pick, myVote, onVote, onUnpublish, isMe }) {
  const author = pick.author || {}
  const bet = pick.bet || {}
  const players = bet.data?.players || []
  const initials = (author.first_name?.slice(0,1) || author.username?.slice(0,1) || '?').toUpperCase() +
    (author.last_name?.slice(0,1) || '').toUpperCase()

  const totalVotes = pick.votes_yes + pick.votes_no
  const yesPct = totalVotes > 0 ? (pick.votes_yes / totalVotes) * 100 : 50

  return (
    <div className="card p-4">
      {/* Header auteur */}
      <div className="flex items-center gap-2 mb-3">
        <Avatar avatarKey={author.avatar_key} initials={initials} size={32} />
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontWeight: 800 }}>@{author.username}</div>
          <div className="caption" style={{ fontSize: 10 }}>
            {new Date(pick.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {isMe && (
          <button
            onClick={() => onUnpublish(pick.id)}
            className="btn-ghost"
            style={{ padding: '4px 10px', fontSize: 11 }}
          >
            Retirer
          </button>
        )}
      </div>

      {/* Caption */}
      {pick.caption && (
        <div className="body mb-3" style={{ fontSize: 13 }}>
          {pick.caption}
        </div>
      )}

      {/* Bet detail */}
      <div className="flex items-center gap-2 p-3 rounded-lg mb-3" style={{
        background: 'var(--ink-800)',
        border: '1px solid var(--ink-600)',
      }}>
        <div className="flex-1 min-w-0">
          {players.length >= 2 && (
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {players[0]} <span style={{ color: 'var(--fg-3)' }}>vs</span> {players[1]}
            </div>
          )}
          <div className="caption" style={{ fontSize: 11 }}>
            {bet.sport === 'tennis' ? 'Tennis' : bet.sport} · {bet.mode === 'simple' ? 'Simple' : 'Combiné'}
          </div>
        </div>
        <div style={{
          fontFamily: 'Archivo Black, sans-serif',
          fontSize: 18, fontWeight: 900,
          color: 'var(--blue-500)',
        }}>
          @{Number(bet.odd).toFixed(2)}
        </div>
      </div>

      {/* Votes bar */}
      {totalVotes > 0 && (
        <div className="mb-3">
          <div style={{
            position: 'relative',
            height: 6, borderRadius: 999,
            background: 'rgba(239,68,68,0.2)',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${yesPct}%`,
              background: 'var(--win-500)',
              transition: 'width 0.3s',
            }} />
          </div>
          <div className="flex items-center justify-between mt-2" style={{ fontSize: 11 }}>
            <span style={{ color: 'var(--win-500)', fontWeight: 700 }}>
              ✓ {pick.votes_yes}
            </span>
            <span style={{ color: 'var(--fg-3)', fontWeight: 600 }}>
              {totalVotes} vote{totalVotes > 1 ? 's' : ''}
            </span>
            <span style={{ color: 'var(--loss-500)', fontWeight: 700 }}>
              ✗ {pick.votes_no}
            </span>
          </div>
        </div>
      )}

      {/* Boutons vote */}
      {!isMe && (
        <div className="flex gap-2">
          <button
            onClick={() => onVote(pick.id, 'yes')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              background: myVote === 'yes' ? 'var(--win-500)' : 'rgba(34,197,94,0.12)',
              border: myVote === 'yes' ? '1.5px solid var(--win-500)' : '1px solid rgba(34,197,94,0.4)',
              color: myVote === 'yes' ? 'white' : 'var(--win-500)',
              fontSize: 13, fontWeight: 800,
              fontFamily: 'Archivo Black, sans-serif',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M 5 12 l 5 5 l 9 -10" />
            </svg>
            Je crois
          </button>
          <button
            onClick={() => onVote(pick.id, 'no')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              background: myVote === 'no' ? 'var(--loss-500)' : 'rgba(239,68,68,0.12)',
              border: myVote === 'no' ? '1.5px solid var(--loss-500)' : '1px solid rgba(239,68,68,0.4)',
              color: myVote === 'no' ? 'white' : 'var(--loss-500)',
              fontSize: 13, fontWeight: 800,
              fontFamily: 'Archivo Black, sans-serif',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M 6 6 l 12 12 M 6 18 l 12 -12" />
            </svg>
            Je doute
          </button>
        </div>
      )}
    </div>
  )
}

function PublishModal({ bets, onPublish, onClose }) {
  const [selectedBetId, setSelectedBetId] = useState(null)
  const [caption, setCaption] = useState('')

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
        <h3 className="h3 mb-4">Publier un pari</h3>

        <div className="caption mb-3" style={{ fontSize: 12 }}>
          Choisis lequel de tes paris pending publier sur le feed.
        </div>

        <div className="space-y-2 mb-4">
          {bets.map(b => {
            const players = b.players || []
            const selected = selectedBetId === b.id
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBetId(b.id)}
                className="w-full text-left p-3 flex items-center gap-3"
                style={{
                  borderRadius: 12,
                  background: selected ? 'rgba(41,98,255,0.12)' : 'var(--ink-800)',
                  border: selected ? '1.5px solid var(--blue-500)' : '1px solid var(--ink-600)',
                  cursor: 'pointer',
                }}
              >
                <div className="flex-1 min-w-0">
                  {players.length >= 2 && (
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {players[0]} vs {players[1]}
                    </div>
                  )}
                  <div className="caption" style={{ fontSize: 11 }}>
                    Mise {b.stake}€ · @{Number(b.odd).toFixed(2)}
                  </div>
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
          <label className="field-label">Caption (optionnel)</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 200))}
            placeholder="Ex: 'Lock de la semaine, il est en feu sur dur'"
            rows={3}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              background: 'var(--ink-800)',
              border: '1px solid var(--ink-600)',
              color: 'var(--fg-1)',
              fontSize: 13,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              resize: 'none',
            }}
          />
          <div className="micro mt-1 text-right" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
            {caption.length}/200
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>
            Annuler
          </button>
          <button
            onClick={() => onPublish(selectedBetId, caption)}
            disabled={!selectedBetId}
            className="btn-primary"
            style={{ flex: 2, opacity: selectedBetId ? 1 : 0.5 }}
          >
            Publier
          </button>
        </div>
      </div>
    </div>
  )
}
