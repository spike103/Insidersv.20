import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Avatar from '../components/Avatar.jsx'
import Icon from '../components/Icon.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { formatPercent, formatCurrencyPrecise, computeROI, totalProfit, computeWinRate } from '../utils/stats.js'

function colorForId(id) {
  const palette = ['#2962ff', '#22c55e', '#f0c85a', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#0ea5e9', '#8b5cf6']
  if (!id) return palette[0]
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]
}

function initialsFor(firstName, lastName, username) {
  const a = (firstName || username || '?').slice(0, 1).toUpperCase()
  const b = (lastName || '').slice(0, 1).toUpperCase()
  return (a + b) || '?'
}

export default function ProfileView() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, friends, sendFriendRequest, removeFriend } = useApp()

  const [target, setTarget] = useState(null)
  const [targetBets, setTargetBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [requestSent, setRequestSent] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Détermine si je suis ami avec ce profil
  const isFriend = useMemo(
    () => (friends || []).some(f => f.username === username),
    [friends, username]
  )

  // Charge le profile target + ses bets (filtrés automatiquement par RLS selon privacy)
  useEffect(() => {
    let mounted = true
    setLoading(true)
    setNotFound(false)
    setTargetBets([])

    const load = async () => {
      try {
        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name, plan, avatar_key, privacy_show_stats, privacy_show_pending_bets, privacy_show_in_leaderboard')
          .eq('username', username)
          .maybeSingle()

        if (!mounted) return

        if (pErr || !prof) {
          setNotFound(true)
          setLoading(false)
          return
        }

        setTarget(prof)

        // Charge les bets — RLS filtre tout seul (on ne reçoit que ce qu'on a le droit de voir)
        const { data: bets } = await supabase
          .from('bets')
          .select('*')
          .eq('user_id', prof.id)
          .order('bet_date', { ascending: false })

        if (!mounted) return
        setTargetBets((bets || []).map(b => ({
          id: b.id,
          status: b.status,
          stake: Number(b.stake),
          odd: Number(b.odd),
          sport: b.sport,
          bet_date: b.bet_date,
          mode: b.mode,
          bookmaker: b.bookmaker,
          cashout: b.cashout_amount,
          ...(b.data || {}),
        })))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [username])

  if (loading) {
    return (
      <>
        <TopBar showBack />
        <div className="px-5 pt-4 pb-24 text-center">
          <div className="card p-6">
            <div className="caption" style={{ color: 'var(--fg-3)' }}>Chargement du profil…</div>
          </div>
        </div>
      </>
    )
  }

  if (notFound || !target) {
    return (
      <>
        <TopBar showBack />
        <div className="px-5 pt-4 pb-24 text-center">
          <div className="card p-6">
            <p className="body">Profil introuvable.</p>
          </div>
        </div>
      </>
    )
  }

  // Stats calculées depuis ce qu'on a reçu (RLS a déjà fait le filtre)
  const settledBets = targetBets.filter(b => b.status === 'won' || b.status === 'lost' || b.status === 'cashout')
  const pendingBets = targetBets.filter(b => b.status === 'pending')

  const stats = {
    roi: computeROI(targetBets),
    profit: totalProfit(targetBets),
    bets: settledBets.length,
    winRate: computeWinRate(targetBets),
  }

  // Privacy : on devine ce qu'on PEUT voir grâce à ce que RLS nous a effectivement renvoyé
  // Si `bets` retourné est vide ET privacy_show_stats == 'friends' ET on n'est pas ami → blurred
  const canSeeStats = target.privacy_show_stats === 'public' ||
                      (target.privacy_show_stats === 'friends' && isFriend) ||
                      target.id === user?.id
  const canSeePending = target.privacy_show_pending_bets === 'public' ||
                         (target.privacy_show_pending_bets === 'friends' && isFriend) ||
                         target.id === user?.id

  const handleSendRequest = async () => {
    const res = await sendFriendRequest(target.username)
    if (res?.ok) setRequestSent(true)
    else if (res?.error) alert(res.error)
  }

  const targetForAvatar = {
    initials: initialsFor(target.first_name, target.last_name, target.username),
    avatarColor: colorForId(target.id),
    avatarKey: target.avatar_key || null,
  }

  return (
    <>
      <TopBar showBack />
      <div className="px-5 pt-2 pb-28">
        {/* Hero profil */}
        <div className="card p-5 mb-4 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <Avatar user={targetForAvatar} size={64} fontSize={22} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="pill-label text-blue" style={{ fontSize: 16 }}>@{target.username}</span>
                {target.plan === 'pro' && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                    color: '#1a0f00', background: 'linear-gradient(135deg, #ffe587, #f0c85a)',
                    padding: '2px 6px', borderRadius: 4,
                  }}>PRO</span>
                )}
                {target.plan === 'sharp' && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                    color: 'white', background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    padding: '2px 6px', borderRadius: 4,
                  }}>SHARP</span>
                )}
              </div>
              <div className="caption mt-1">
                {target.first_name} {target.last_name}
              </div>
            </div>
          </div>

          {target.id === user?.id ? (
            <div className="caption text-center" style={{ color: 'var(--fg-3)' }}>
              C'est ton profil
            </div>
          ) : isFriend ? (
            <button
              onClick={() => removeFriend(target.id)}
              className="btn-ghost w-full"
              style={{ color: 'var(--loss-400)', borderColor: 'rgba(239,68,68,0.3)', fontSize: 13 }}
            >
              <Icon name="close" size={14} />
              Retirer des amis
            </button>
          ) : requestSent ? (
            <div className="card-gold text-center" style={{ padding: 10, fontSize: 12, fontWeight: 700 }}>
              Demande envoyée ✓
            </div>
          ) : (
            <button onClick={handleSendRequest} className="btn-primary">
              <Icon name="add" size={14} color="white" />
              Ajouter en ami
            </button>
          )}
        </div>

        {/* Stats */}
        {canSeeStats ? (
          <>
            <h3 className="h3 mb-3">Stats</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <StatCard label="ROI" value={formatPercent(stats.roi)} positive={stats.roi >= 0} />
              <StatCard label="Profit" value={formatCurrencyPrecise(stats.profit)} positive={stats.profit >= 0} />
              <StatCard label="Paris" value={String(stats.bets)} neutral />
              <StatCard label="% réussis" value={`${stats.winRate}%`} positive={stats.winRate >= 50} />
            </div>
          </>
        ) : (
          <BlurredCard
            message="Stats visibles aux amis uniquement"
            cta={requestSent ? null : "Ajouter en ami"}
            onAction={handleSendRequest}
          />
        )}

        {/* Paris en cours */}
        <h3 className="h3 mb-3 mt-6">Paris en cours</h3>
        {canSeePending ? (
          pendingBets.length === 0 ? (
            <div className="card p-5 text-center caption">Aucun pari en cours.</div>
          ) : (
            <div className="space-y-2">
              {pendingBets.map((p) => {
                const matchLabel = (p.players || []).join(' vs ') || 'Match'
                return (
                  <div key={p.id} className="card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span style={{
                        padding: '3px 8px', borderRadius: 6,
                        background: 'rgba(41,98,255,0.15)',
                        border: '1px solid rgba(41,98,255,0.35)',
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                        color: 'var(--blue-500)',
                      }}>
                        EN COURS
                      </span>
                      <SportIcon sport={p.sport} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{matchLabel}</div>
                    <div className="micro text-fg-3 mt-1">
                      {p.bookmaker || '—'}{p.surface ? ` · ${p.surface}` : ''}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--ink-600)' }}>
                      <span className="caption">Mise <b style={{ color: 'var(--fg-1)' }}>{p.stake}€</b></span>
                      <span className="font-bold" style={{ color: 'var(--blue-500)', fontSize: 14 }}>@ {Number(p.odd).toFixed(2)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <BlurredCard
            message="Paris en cours visibles aux amis uniquement"
            cta={requestSent ? null : "Ajouter en ami"}
            onAction={handleSendRequest}
          />
        )}
      </div>
    </>
  )
}

function StatCard({ label, value, positive, neutral }) {
  const color = neutral ? 'var(--fg-1)' : positive ? 'var(--win-500)' : 'var(--loss-500)'
  return (
    <div className="card p-3">
      <div className="field-label" style={{ marginBottom: 6 }}>{label}</div>
      <div className="stat-value" style={{ color, fontSize: 22 }}>{value}</div>
    </div>
  )
}

function BlurredCard({ message, cta, onAction }) {
  return (
    <div className="card p-6 text-center" style={{
      backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.03) 6px 12px)',
    }}>
      <Icon name="incognito" size={28} color="muted" className="mx-auto mb-3" />
      <p className="body mb-3">{message}</p>
      {cta && (
        <button onClick={onAction} className="btn-primary" style={{ width: 'auto', padding: '10px 18px' }}>
          {cta}
        </button>
      )}
    </div>
  )
}

function SportIcon({ sport }) {
  const stroke = 'var(--fg-2)'
  if (sport === 'tennis') return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={stroke} strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M 3.5 8 Q 12 14 20.5 8" strokeLinecap="round" />
      <path d="M 3.5 16 Q 12 10 20.5 16" strokeLinecap="round" />
    </svg>
  )
  if (sport === 'football') return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M 12 5 L 16 8 L 14 13 L 10 13 L 8 8 Z" />
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M 3 12 L 21 12 M 12 3 L 12 21 M 5.5 5.5 Q 12 12 18.5 18.5 M 18.5 5.5 Q 12 12 5.5 18.5" />
    </svg>
  )
}
