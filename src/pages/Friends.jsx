import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Avatar from '../components/Avatar.jsx'
import Icon from '../components/Icon.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { computeROI, formatPercent } from '../utils/stats.js'

export default function Friends() {
  const navigate = useNavigate()
  const { user, friends, friendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } = useApp()
  const [tab, setTab] = useState('mine') // 'mine' | 'requests' | 'discover'
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [friendProfiles, setFriendProfiles] = useState([])
  const [requestProfiles, setRequestProfiles] = useState([])
  const [feedback, setFeedback] = useState(null)

  // friends est maintenant une liste d'objets profile chargés depuis AppContext
  // (changé pour faciliter l'affichage sans double-fetch)
  // On utilise donc directement friends comme friendProfiles
  useEffect(() => {
    setFriendProfiles(friends || [])
  }, [friends])

  // Charger les profils des senders de friend requests
  useEffect(() => {
    let cancelled = false
    if (!friendRequests || friendRequests.length === 0) {
      setRequestProfiles([])
      return
    }
    const load = async () => {
      const senderIds = friendRequests.map(r => r.from_user_id)
      const { data } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, plan, avatar_key')
        .in('id', senderIds)
      if (!cancelled) setRequestProfiles(data || [])
    }
    load()
    return () => { cancelled = true }
  }, [friendRequests])

  // Recherche d'utilisateurs (par username ou prénom)
  useEffect(() => {
    let cancelled = false
    if (!search.trim()) {
      setSearchResults([])
      return
    }
    const q = search.trim().toLowerCase()
    setSearching(true)
    const friendIds = (friends || []).map(f => f.id)
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, plan, avatar_key')
        .eq('privacy_show_in_leaderboard', true)
        .or(`username.ilike.%${q}%,first_name.ilike.%${q}%`)
        .limit(20)
      if (!cancelled) {
        const filtered = (data || []).filter(p =>
          p.id !== user?.id && !friendIds.includes(p.id)
        )
        setSearchResults(filtered)
        setSearching(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [search, user?.id, friends])

  const handleAdd = async (username) => {
    setFeedback(null)
    const res = await sendFriendRequest(username)
    if (res.ok) {
      setFeedback({ kind: 'success', text: `Demande envoyée à @${username}` })
      // Retirer le user des résultats de recherche
      setSearchResults(prev => prev.filter(u => u.username !== username))
    } else {
      setFeedback({ kind: 'error', text: res.error })
    }
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <>
      <TopBar title="Mes amis" />
      <div className="px-5 pt-2 pb-28">
        <div className="segmented mb-5">
          <button onClick={() => setTab('mine')} className={`seg-btn ${tab === 'mine' ? 'active' : ''}`}>
            Amis ({friends?.length || 0})
          </button>
          <button onClick={() => setTab('requests')} className={`seg-btn ${tab === 'requests' ? 'active' : ''}`}>
            Demandes{friendRequests?.length > 0 && ` (${friendRequests.length})`}
          </button>
          <button onClick={() => setTab('discover')} className={`seg-btn ${tab === 'discover' ? 'active' : ''}`}>
            Chercher
          </button>
        </div>

        {feedback && (
          <div className="card mb-4 p-3" style={{
            background: feedback.kind === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            borderColor: feedback.kind === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
            color: feedback.kind === 'success' ? 'var(--win-500)' : 'var(--loss-500)',
            fontSize: 13, fontWeight: 600,
          }}>
            {feedback.text}
          </div>
        )}

        {tab === 'mine' && (
          friendProfiles.length === 0 ? (
            <EmptyState
              title="Aucun ami pour l'instant"
              body="Cherche des potes par leur username pour comparer vos stats."
              cta="Chercher des users"
              onCta={() => setTab('discover')}
            />
          ) : (
            <div className="space-y-2">
              {friendProfiles.map(f => (
                <UserRow
                  key={f.id}
                  u={f}
                  action="remove"
                  onAction={() => removeFriend(f.id)}
                  onClick={() => navigate(`/profile/${f.username}`)}
                />
              ))}
            </div>
          )
        )}

        {tab === 'requests' && (
          requestProfiles.length === 0 ? (
            <EmptyState
              title="Aucune demande"
              body="Quand quelqu'un t'envoie une demande d'ami, elle apparaîtra ici."
            />
          ) : (
            <div className="space-y-2">
              {requestProfiles.map(p => {
                const req = friendRequests.find(r => r.from_user_id === p.id)
                return (
                  <RequestRow
                    key={p.id}
                    u={p}
                    onAccept={async () => {
                      await acceptFriendRequest(req.id)
                      setFeedback({ kind: 'success', text: `${p.first_name} est maintenant ton ami` })
                      setTimeout(() => setFeedback(null), 3000)
                    }}
                    onReject={async () => {
                      await rejectFriendRequest(req.id)
                    }}
                    onClick={() => navigate(`/profile/${p.username}`)}
                  />
                )
              })}
            </div>
          )
        )}

        {tab === 'discover' && (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Rechercher par username ou prénom…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoCapitalize="none"
                autoComplete="off"
              />
            </div>
            {searching ? (
              <div className="caption text-center py-6">Recherche…</div>
            ) : search.trim() && searchResults.length === 0 ? (
              <div className="caption text-center py-6">Aucun résultat pour « {search} »</div>
            ) : !search.trim() ? (
              <div className="caption text-center py-6">Tape un username ou prénom pour commencer</div>
            ) : (
              <div className="space-y-2">
                {searchResults.map(u => (
                  <UserRow
                    key={u.id}
                    u={u}
                    action="add"
                    onAction={() => handleAdd(u.username)}
                    onClick={() => navigate(`/profile/${u.username}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

function UserRow({ u, action, onAction, onClick }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <Avatar
          initials={(u.first_name?.slice(0,1) || u.username?.slice(0,1) || '?').toUpperCase() + (u.last_name?.slice(0,1) || '').toUpperCase()}
          color={`#${(u.id || '').slice(0, 6).padEnd(6, 'a')}`}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="pill-label text-blue" style={{ fontSize: 14 }}>@{u.username}</span>
            {u.plan && u.plan !== 'free' && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                color: '#1a0f00', background: 'linear-gradient(135deg, #ffe587, #f0c85a)',
                padding: '2px 6px', borderRadius: 4,
                textTransform: 'uppercase',
              }}>{u.plan}</span>
            )}
          </div>
          <div className="micro text-fg-3 mt-0.5">
            {u.first_name} {u.last_name}
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAction() }}
        className={action === 'add' ? 'btn-add' : ''}
        style={action === 'remove' ? {
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--ink-700)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        } : { flexShrink: 0, padding: '6px 10px', fontSize: 12 }}
      >
        {action === 'add' ? (
          <>
            <Icon name="add" size={12} color="white" />
            Ajouter
          </>
        ) : (
          <Icon name="close" size={14} color="muted" />
        )}
      </button>
    </div>
  )
}

function RequestRow({ u, onAccept, onReject, onClick }) {
  return (
    <div className="card p-3">
      <button
        onClick={onClick}
        className="flex items-center gap-3 w-full text-left mb-3"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <Avatar
          initials={(u.first_name?.slice(0,1) || u.username?.slice(0,1) || '?').toUpperCase() + (u.last_name?.slice(0,1) || '').toUpperCase()}
          color={`#${(u.id || '').slice(0, 6).padEnd(6, 'a')}`}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="pill-label text-blue" style={{ fontSize: 14 }}>@{u.username}</span>
          </div>
          <div className="micro text-fg-3 mt-0.5">
            {u.first_name} {u.last_name} · veut t'ajouter
          </div>
        </div>
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onAccept}
          className="btn-primary"
          style={{ padding: '8px', fontSize: 13 }}
        >
          Accepter
        </button>
        <button
          onClick={onReject}
          className="btn-ghost"
          style={{ padding: '8px', fontSize: 13 }}
        >
          Refuser
        </button>
      </div>
    </div>
  )
}

function EmptyState({ title, body, cta, onCta }) {
  return (
    <div className="card p-8 text-center">
      <h3 className="h3 mb-1">{title}</h3>
      <p className="body mb-4">{body}</p>
      {cta && (
        <button onClick={onCta} className="btn-primary" style={{ width: 'auto', padding: '10px 18px' }}>
          {cta}
        </button>
      )}
    </div>
  )
}
