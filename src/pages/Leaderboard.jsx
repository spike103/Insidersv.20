import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Avatar from '../components/Avatar.jsx'
import Icon from '../components/Icon.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { formatPercent, formatCurrencyPrecise, computeROI, totalProfit, computeWinRate } from '../utils/stats.js'

// Couleur déterministe à partir de l'UUID (palette de 10)
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

export default function Leaderboard() {
  const navigate = useNavigate()
  const { user, friends } = useApp()
  const [scope, setScope] = useState('global') // 'global' | 'friends'
  const [metric, setMetric] = useState('roi')   // 'roi' | 'profit'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  // Charge le leaderboard depuis la vue v_leaderboard
  useEffect(() => {
    let mounted = true
    setLoading(true)

    const load = async () => {
      try {
        let query = supabase
          .from('v_leaderboard')
          .select('id, username, first_name, last_name, plan, avatar_key, bets_count, profit, roi')
          .order(metric === 'roi' ? 'roi' : 'profit', { ascending: false })
          .limit(50)

        // Si scope friends : restreindre aux IDs amis
        if (scope === 'friends') {
          const friendIds = (friends || []).map(f => f.id).filter(Boolean)
          if (friendIds.length === 0 && user?.id) {
            // Pas d'amis → on n'affichera que toi
            query = query.eq('id', user.id)
          } else if (user?.id) {
            query = query.in('id', [...friendIds, user.id])
          }
        }

        const { data, error } = await query
        if (!mounted) return
        if (error) {
          console.error('[Leaderboard]', error)
          setRows([])
        } else {
          setRows(data || [])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [scope, metric, friends, user?.id])

  // Convertit les rows DB → format frontend (initials, avatarColor, isMe)
  const list = useMemo(() => {
    return rows.map((r, i) => ({
      id: r.id,
      username: r.username,
      firstName: r.first_name || '',
      lastName: r.last_name || '',
      initials: initialsFor(r.first_name, r.last_name, r.username),
      avatarColor: colorForId(r.id),
      avatarKey: r.avatar_key || null,
      plan: r.plan,
      bets: r.bets_count || 0,
      profit: Number(r.profit) || 0,
      roi: Number(r.roi) || 0,
      rank: i + 1,
      isMe: r.id === user?.id,
    }))
  }, [rows, user?.id])

  return (
    <>
      <TopBar title="Classement" />
      <div className="px-5 pt-2 pb-28">

        {/* Hub social — accès aux 3 features */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <SocialEntry
            label="Challenges"
            color="#a855f7"
            iconName="sparkle"
            onClick={() => navigate('/challenges')}
          />
          <SocialEntry
            label="Picks"
            color="#2962ff"
            iconName="sparkle"
            onClick={() => navigate('/picks')}
          />
          <SocialEntry
            label="Battles"
            color="#ef4444"
            iconName="crown"
            onClick={() => navigate('/battles')}
          />
        </div>

        <div className="segmented mb-3">
          <button onClick={() => setScope('global')} className={`seg-btn ${scope === 'global' ? 'active' : ''}`}>
            Mondial
          </button>
          <button onClick={() => setScope('friends')} className={`seg-btn ${scope === 'friends' ? 'active' : ''}`}>
            Amis
          </button>
        </div>

        <div className="segmented mb-5" style={{ fontSize: 11 }}>
          <button onClick={() => setMetric('roi')} className={`seg-btn ${metric === 'roi' ? 'active' : ''}`}>
            ROI
          </button>
          <button onClick={() => setMetric('profit')} className={`seg-btn ${metric === 'profit' ? 'active' : ''}`}>
            Profit
          </button>
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="caption" style={{ color: 'var(--fg-3)' }}>Chargement du classement…</div>
          </div>
        ) : list.length === 0 ? (
          <div className="card p-8 text-center">
            <Icon name="crown" size={40} color="muted" className="mx-auto mb-3" />
            <h3 className="h3 mb-1">Pas encore de classement</h3>
            <p className="body">{scope === 'friends' ? "Ajoute des amis pour les voir apparaître ici." : "Sois le premier à valider tes paris !"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((u, i) => <LeaderRow key={u.id || u.username} u={u} metric={metric} onClick={() => !u.isMe && navigate(`/profile/${u.username}`)} />)}
          </div>
        )}
      </div>
    </>
  )
}

function LeaderRow({ u, metric, onClick }) {
  const value = metric === 'roi' ? formatPercent(u.roi) : formatCurrencyPrecise(u.profit)
  const valueColor = (u[metric] || 0) >= 0 ? 'var(--win-500)' : 'var(--loss-500)'
  const isPodium = u.rank <= 3

  // Couleurs podium : or, argent, bronze
  const podiumColor = u.rank === 1 ? '#f0c85a' : u.rank === 2 ? '#c0c8d4' : u.rank === 3 ? '#cd7f32' : null

  return (
    <button
      onClick={onClick}
      disabled={u.isMe}
      className="card w-full p-3 flex items-center gap-3 text-left"
      style={{
        cursor: u.isMe ? 'default' : 'pointer',
        background: u.isMe ? 'rgba(41,98,255,0.12)' : undefined,
        borderColor: u.isMe ? 'var(--blue-500)' : undefined,
      }}
    >
      {/* Rank badge — SVG médaille pour podium, # pour le reste */}
      <div style={{
        width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {podiumColor ? (
          <svg viewBox="0 0 36 36" width="32" height="32">
            <defs>
              <linearGradient id={`medal-${u.rank}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={podiumColor} stopOpacity="1" />
                <stop offset="100%" stopColor={podiumColor} stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <circle cx="18" cy="20" r="11" fill={`url(#medal-${u.rank})`} stroke={podiumColor} strokeWidth="1.5" />
            <path d="M 12 4 L 14 14 L 18 16 L 22 14 L 24 4 Z" fill={podiumColor} opacity="0.6" />
            <text x="18" y="24" textAnchor="middle" fontSize="11" fontWeight="900" fill="#1a0f00" fontFamily="Archivo Black">
              {u.rank}
            </text>
          </svg>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 800, color: u.isMe ? 'var(--blue-500)' : 'var(--fg-3)', fontFamily: 'Archivo Black' }}>
            #{u.rank}
          </span>
        )}
      </div>

      <Avatar user={u} size={36} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="pill-label" style={{ fontSize: 13, color: u.isMe ? 'var(--blue-500)' : 'var(--fg-1)' }}>
            {u.isMe ? 'Toi' : `@${u.username}`}
          </span>
          {u.verified && <span style={{ color: 'var(--blue-500)', fontSize: 10 }}>✓</span>}
          {u.plan === 'premium' && (
            <span style={{
              fontSize: 8, fontWeight: 800, letterSpacing: '0.1em',
              color: '#1a0f00', background: 'linear-gradient(135deg, #ffe587, #f0c85a)',
              padding: '1px 5px', borderRadius: 3,
            }}>PRO</span>
          )}
        </div>
        <div className="micro text-fg-3 mt-0.5">
          {u.bets} paris · {u.winRate?.toFixed?.(0) || u.winRate}% gagnés
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold" style={{ color: valueColor }}>{value}</div>
        <div className="micro text-fg-3">{metric === 'roi' ? 'ROI' : 'Profit'}</div>
      </div>
    </button>
  )
}

function SocialEntry({ label, color, iconName, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card p-3"
      style={{
        cursor: 'pointer',
        background: `linear-gradient(135deg, ${color}24 0%, ${color}06 100%)`,
        borderColor: `${color}55`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 90,
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: `${color}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon name={iconName} size={18} style={{ stroke: color }} />
      </div>
      <div style={{
        fontFamily: 'Archivo Black, sans-serif',
        fontSize: 12,
        fontWeight: 900,
        fontStyle: 'italic',
        color: 'white',
        letterSpacing: '0.04em',
      }}>
        {label}
      </div>
    </button>
  )
}
