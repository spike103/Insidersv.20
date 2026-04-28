import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { supabase } from '../lib/supabase.js'

export default function Challenges() {
  const navigate = useNavigate()
  const { user, bets } = useApp()
  const [challenges, setChallenges] = useState([])
  const [participants, setParticipants] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active')
        .order('ends_at', { ascending: true })
      setChallenges(data || [])
      if (data && data.length > 0) setActiveId(data[0].id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!activeId) return
    const loadPart = async () => {
      const { data } = await supabase
        .from('challenge_participants')
        .select(`user_id, bets_count, metric_value, rank, reward_credits,
          profiles ( id, username, first_name, last_name, avatar_key, plan )`)
        .eq('challenge_id', activeId)
        .order('metric_value', { ascending: false })
        .limit(50)
      setParticipants(prev => ({ ...prev, [activeId]: data || [] }))
    }
    loadPart()
  }, [activeId])

  const myEstimatedRank = useMemo(() => {
    if (!activeId || !user) return null
    const challenge = challenges.find(c => c.id === activeId)
    if (!challenge) return null
    const myValue = computeMyMetric(bets || [], challenge)
    if (myValue == null) return null
    const list = participants[activeId] || []
    const better = list.filter(p => Number(p.metric_value) > myValue).length
    return { rank: better + 1, value: myValue, total: list.length }
  }, [activeId, challenges, participants, bets, user])

  if (loading) {
    return (
      <>
        <TopBar showBack title="Challenges" />
        <div className="px-5 pt-4 flex justify-center">
          <div className="animate-spin" style={{
            width: 24, height: 24, borderRadius: '50%',
            border: '2px solid var(--ink-600)', borderTopColor: 'var(--blue-500)',
          }} />
        </div>
      </>
    )
  }

  if (challenges.length === 0) {
    return (
      <>
        <TopBar showBack title="Challenges" />
        <div className="px-5 pt-4">
          <EmptyState />
        </div>
      </>
    )
  }

  const activeChallenge = challenges.find(c => c.id === activeId) || challenges[0]
  const list = participants[activeId] || []

  return (
    <>
      <TopBar showBack title="Challenges" />
      <div className="px-5 pt-2 pb-28">
        <ChallengeHero challenge={activeChallenge} myStat={myEstimatedRank} />

        {challenges.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 -mx-1 px-1">
            {challenges.map(c => (
              <button key={c.id} onClick={() => setActiveId(c.id)}
                className={`chip flex-shrink-0 ${activeId === c.id ? 'active' : ''}`}>
                {c.title}
              </button>
            ))}
          </div>
        )}

        <h3 className="h3 mb-3">Classement en temps réel</h3>
        {list.length === 0 ? (
          <div className="card p-6 text-center">
            <div className="caption" style={{ fontSize: 13 }}>
              Aucun participant pour l'instant. Sois le premier à entrer dans le top !
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((p, i) => (
              <ParticipantRow key={p.user_id} participant={p} rank={i + 1}
                isMe={p.user_id === user?.id} challenge={activeChallenge}
                onClick={() => p.profiles?.username && navigate(`/profile/${p.profiles.username}`)} />
            ))}
          </div>
        )}

        <div className="card p-4 mt-5">
          <h4 className="micro mb-3" style={{ color: 'var(--blue-500)', fontWeight: 800, letterSpacing: '0.15em' }}>
            RÉCOMPENSES
          </h4>
          <div className="space-y-2">
            {Object.entries(activeChallenge.rewards).map(([rank, credits]) => (
              <div key={rank} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RankBadge rank={Number(rank)} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {rank === '1' ? '1ère place' : `${rank}ème place`}
                  </span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 14, fontWeight: 900,
                  fontFamily: 'Archivo Black, sans-serif',
                  color: 'var(--gold-400)',
                }}>
                  <Icon name="crown" size={13} color="gold" />+{credits}
                </div>
              </div>
            ))}
          </div>
          <div className="caption mt-3" style={{ fontSize: 11 }}>
            Les récompenses sont attribuées automatiquement à la fin du challenge.
          </div>
        </div>
      </div>
    </>
  )
}

function ChallengeHero({ challenge, myStat }) {
  const endTime = new Date(challenge.ends_at).getTime()
  const remaining = Math.max(0, endTime - Date.now())
  const days = Math.floor(remaining / (24 * 3600 * 1000))
  const hours = Math.floor((remaining % (24 * 3600 * 1000)) / (3600 * 1000))
  const minBets = challenge.rules?.minBets || 5

  return (
    <div className="card mb-4 animate-fade-in" style={{
      padding: '22px 20px',
      background: 'linear-gradient(135deg, rgba(41,98,255,0.18) 0%, rgba(41,98,255,0.04) 100%)',
      border: '1.5px solid rgba(41,98,255,0.4)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -50, right: -50,
        width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(41,98,255,0.25), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div className="flex items-center gap-2 mb-2" style={{ position: 'relative' }}>
        <Icon name="crown" size={16} color="gold" />
        <div className="micro" style={{ color: 'var(--blue-500)', fontWeight: 800, letterSpacing: '0.18em' }}>
          CHALLENGE EN COURS
        </div>
      </div>
      <h2 style={{
        fontSize: 28, fontWeight: 900,
        fontFamily: 'Archivo Black, sans-serif',
        fontStyle: 'italic', lineHeight: 1.05,
        color: 'white', marginBottom: 8,
        textTransform: 'uppercase', position: 'relative',
      }}>{challenge.title}</h2>
      {challenge.description && (
        <p className="body" style={{ fontSize: 13, marginBottom: 14, position: 'relative' }}>
          {challenge.description}
        </p>
      )}
      <div className="flex gap-3" style={{ position: 'relative' }}>
        <div className="flex-1" style={{
          padding: '8px 12px', borderRadius: 10,
          background: 'rgba(2,11,32,0.4)', border: '1px solid rgba(41,98,255,0.2)',
        }}>
          <div className="micro" style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--fg-3)' }}>
            FIN DANS
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'Archivo Black, sans-serif', color: 'white' }}>
            {days > 0 ? `${days}j ${hours}h` : `${hours}h`}
          </div>
        </div>
        <div className="flex-1" style={{
          padding: '8px 12px', borderRadius: 10,
          background: 'rgba(2,11,32,0.4)', border: '1px solid rgba(41,98,255,0.2)',
        }}>
          <div className="micro" style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--fg-3)' }}>
            MINIMUM
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'Archivo Black, sans-serif', color: 'white' }}>
            {minBets} paris
          </div>
        </div>
      </div>
      {myStat && (
        <div className="mt-3" style={{
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          position: 'relative',
        }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="micro" style={{ fontSize: 10, color: 'var(--win-500)', fontWeight: 800, letterSpacing: '0.1em' }}>
                TA POSITION ESTIMÉE
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'Archivo Black, sans-serif', color: 'white' }}>
                {myStat.rank === 1 ? '1ère' : `${myStat.rank}ème`}
                <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 6 }}>/ {myStat.total + 1}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="micro" style={{ fontSize: 10, color: 'var(--fg-3)', fontWeight: 800, letterSpacing: '0.1em' }}>
                {(challenge.rules?.metric || 'roi').toUpperCase()}
              </div>
              <div style={{
                fontSize: 18, fontWeight: 900, fontFamily: 'Archivo Black, sans-serif',
                color: myStat.value >= 0 ? 'var(--win-500)' : 'var(--loss-500)',
              }}>
                {myStat.value >= 0 ? '+' : ''}{myStat.value.toFixed(1)}{(challenge.rules?.metric === 'roi' ? '%' : '')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ParticipantRow({ participant, rank, isMe, challenge, onClick }) {
  const profile = participant.profiles || {}
  const metric = challenge.rules?.metric || 'roi'
  const value = Number(participant.metric_value)
  const displayName = profile.first_name || profile.username || '?'
  const initials = ((profile.first_name?.slice(0, 1) || profile.username?.slice(0, 1) || '?').toUpperCase()
    + (profile.last_name?.slice(0, 1) || '').toUpperCase())
  return (
    <button onClick={onClick} className="card w-full p-3 text-left flex items-center gap-3" style={{
      cursor: 'pointer',
      borderColor: isMe ? 'var(--blue-500)' : 'var(--ink-600)',
      background: isMe ? 'rgba(41,98,255,0.08)' : 'var(--ink-800)',
      borderWidth: isMe ? '1.5px' : '1px',
    }}>
      <RankBadge rank={rank} />
      <Avatar avatarKey={profile.avatar_key} initials={initials} color="#2962ff" size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg-1)' }}>{displayName}</span>
          {isMe && (
            <span style={{
              padding: '1px 6px', borderRadius: 4,
              background: 'var(--blue-500)', color: 'white',
              fontSize: 9, fontWeight: 900,
              fontFamily: 'Archivo Black, sans-serif', letterSpacing: '0.08em',
            }}>TOI</span>
          )}
        </div>
        <div className="caption" style={{ fontSize: 11 }}>
          {participant.bets_count} pari{participant.bets_count > 1 ? 's' : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 16, fontWeight: 900,
          fontFamily: 'Archivo Black, sans-serif',
          color: value >= 0 ? 'var(--win-500)' : 'var(--loss-500)',
        }}>
          {value >= 0 ? '+' : ''}{value.toFixed(1)}{metric === 'roi' ? '%' : ''}
        </div>
      </div>
    </button>
  )
}

function RankBadge({ rank }) {
  const palette = {
    1: { bg: '#FFD700', fg: '#020b20' },
    2: { bg: '#C0C0C0', fg: '#020b20' },
    3: { bg: '#CD7F32', fg: 'white' },
  }
  const p = palette[rank] || { bg: 'var(--ink-700)', fg: 'var(--fg-2)' }
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 999,
      background: p.bg, color: p.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 900,
      fontFamily: 'Archivo Black, sans-serif', flexShrink: 0,
    }}>{rank}</div>
  )
}

function EmptyState() {
  return (
    <div className="card p-8 text-center">
      <div style={{
        width: 56, height: 56, margin: '0 auto 16px',
        borderRadius: 16, background: 'var(--ink-700)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="crown" size={26} color="muted" />
      </div>
      <h3 className="h3 mb-1">Pas de challenge en cours</h3>
      <p className="body" style={{ fontSize: 13 }}>
        Reviens lundi pour le prochain challenge hebdo et tente de gagner des crédits.
      </p>
    </div>
  )
}

function computeMyMetric(bets, challenge) {
  const rules = challenge.rules || {}
  const startTime = new Date(challenge.starts_at).getTime()
  const endTime = new Date(challenge.ends_at).getTime()
  let eligibleBets = bets.filter(b => {
    const t = new Date(b.date).getTime()
    if (t < startTime || t > endTime) return false
    if (b.status === 'pending') return false
    if (rules.sport && b.sport !== rules.sport) return false
    if (rules.surface && b.surface !== rules.surface) return false
    return true
  })
  if (eligibleBets.length < (rules.minBets || 1)) return null
  if (rules.metric === 'profit') {
    return eligibleBets.reduce((sum, b) => {
      if (b.status === 'won') return sum + (b.stake * (b.odd - 1))
      if (b.status === 'lost') return sum - b.stake
      if (b.status === 'cashout' && b.cashout != null) return sum + (b.cashout - b.stake)
      return sum
    }, 0)
  }
  const totalStake = eligibleBets.reduce((sum, b) => sum + b.stake, 0)
  if (totalStake === 0) return 0
  const totalProfit = eligibleBets.reduce((sum, b) => {
    if (b.status === 'won') return sum + (b.stake * (b.odd - 1))
    if (b.status === 'lost') return sum - b.stake
    if (b.status === 'cashout' && b.cashout != null) return sum + (b.cashout - b.stake)
    return sum
  }, 0)
  return (totalProfit / totalStake) * 100
}
