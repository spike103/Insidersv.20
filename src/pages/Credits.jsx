import React, { useEffect, useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { MISSIONS, REWARDS_CATALOG, PURCHASE_PACKS, fetchTransactions, spendCredits } from '../lib/credits.js'

export default function Credits() {
  const { user, refreshProfile } = useApp()
  const [tab, setTab] = useState('earn') // 'earn' | 'spend' | 'shop' | 'history'
  const [transactions, setTransactions] = useState([])
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (tab === 'history' && user?.id) {
      fetchTransactions(user.id).then(setTransactions)
    }
  }, [tab, user?.id])

  if (!user) return null

  const credits = user.credits || 0

  const handleSpend = async (rewardId) => {
    const reward = REWARDS_CATALOG.find(r => r.id === rewardId)
    if (!reward) return
    if (credits < reward.cost) {
      setFeedback({ kind: 'error', text: `Il te manque ${reward.cost - credits} crédits` })
      setTimeout(() => setFeedback(null), 3000)
      return
    }
    if (!confirm(`Débloquer "${reward.title}" pour ${reward.cost} crédits ?`)) return

    const res = await spendCredits(user.id, rewardId)
    if (res.ok) {
      await refreshProfile?.()
      setFeedback({ kind: 'success', text: `${reward.title} débloqué !` })
    } else {
      setFeedback({ kind: 'error', text: res.error || 'Erreur' })
    }
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <>
      <TopBar showBack title="Crédits" />
      <div className="px-5 pt-2 pb-28">

        {/* HERO solde — gros et clair */}
        <div
          className="card mb-5 animate-fade-in"
          style={{
            padding: '24px 22px',
            background: 'linear-gradient(135deg, rgba(41,98,255,0.18) 0%, rgba(41,98,255,0.04) 100%)',
            border: '1.5px solid rgba(41,98,255,0.4)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', top: -50, right: -50,
            width: 180, height: 180, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(41,98,255,0.25), transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div className="flex items-center gap-2 mb-2" style={{ position: 'relative' }}>
            <Icon name="crown" size={20} color="gold" />
            <div className="micro" style={{ color: 'var(--blue-500)', fontWeight: 800, letterSpacing: '0.18em' }}>
              MON SOLDE
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            position: 'relative',
          }}>
            <div style={{
              fontSize: 64,
              fontWeight: 900,
              fontFamily: 'Archivo Black, sans-serif',
              lineHeight: 1,
              color: 'white',
              fontStyle: 'italic',
            }}>
              {credits}
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--fg-3)',
            }}>
              crédit{credits > 1 ? 's' : ''}
            </div>
          </div>

          <div className="caption mt-2" style={{ position: 'relative', fontSize: 12 }}>
            Gagne-en gratuitement ou achète des features premium.
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

        {/* TABS — pattern segmented identique aux autres pages */}
        <div className="segmented mb-5">
          <button onClick={() => setTab('earn')}    className={`seg-btn ${tab === 'earn'    ? 'active' : ''}`}>Gagner</button>
          <button onClick={() => setTab('spend')}   className={`seg-btn ${tab === 'spend'   ? 'active' : ''}`}>Dépenser</button>
          <button onClick={() => setTab('shop')}    className={`seg-btn ${tab === 'shop'    ? 'active' : ''}`}>Acheter</button>
          <button onClick={() => setTab('history')} className={`seg-btn ${tab === 'history' ? 'active' : ''}`}>Histo</button>
        </div>

        {tab === 'earn' && <EarnTab user={user} />}
        {tab === 'spend' && <SpendTab credits={credits} onSpend={handleSpend} />}
        {tab === 'shop' && <ShopTab />}
        {tab === 'history' && <HistoryTab transactions={transactions} />}
      </div>
    </>
  )
}

// ============================================================
// ONGLET GAGNER — missions visuelles
// ============================================================
function EarnTab({ user }) {
  return (
    <div>
      <h3 className="h3 mb-3">Missions disponibles</h3>
      <div className="space-y-2">
        {MISSIONS.map(m => (
          <MissionCard key={m.id} mission={m} user={user} />
        ))}
      </div>
    </div>
  )
}

function MissionCard({ mission, user }) {
  const bets = user.bets || []
  let completed = false
  let progressLabel = null

  if (mission.id === 'signup') {
    completed = true
  } else if (mission.id === 'first_bet') {
    completed = bets.length > 0
  } else if (mission.id === 'profile_complete') {
    completed = !!user.avatarKey && bets.length > 0
    if (!completed) {
      const items = []
      if (!user.avatarKey) items.push('avatar')
      if (bets.length === 0) items.push('1er pari')
      progressLabel = items.length > 0 ? `Manque : ${items.join(' + ')}` : null
    }
  } else if (mission.id === 'win') {
    const won = bets.filter(b => b.status === 'won').length
    progressLabel = won > 0 ? `${won} pari${won > 1 ? 's' : ''} gagné${won > 1 ? 's' : ''}` : 'Aucun pari gagné'
  } else if (mission.id === 'streak_3') {
    progressLabel = 'Auto-attribué après 3 wins consécutifs'
  } else if (mission.id === 'login_7d') {
    progressLabel = '7 connexions consécutives requises'
  }

  return (
    <div className="card p-4" style={{
      background: completed ? 'rgba(34,197,94,0.06)' : 'var(--ink-800)',
      borderColor: completed ? 'rgba(34,197,94,0.35)' : 'var(--ink-600)',
    }}>
      <div className="flex items-center gap-3">
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: completed ? 'rgba(34,197,94,0.18)' : 'rgba(41,98,255,0.12)',
          border: completed ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(41,98,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {completed ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--win-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 5 12 l 5 5 l 9 -10" />
            </svg>
          ) : (
            <Icon name={iconForMission(mission.id)} size={20} color="blue" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 14, fontWeight: 800, color: completed ? 'var(--win-500)' : 'var(--fg-1)' }}>
            {mission.title}
          </div>
          <div className="caption mt-0.5" style={{ fontSize: 12 }}>
            {mission.description}
          </div>
          {progressLabel && (
            <div className="micro mt-1.5" style={{
              color: 'var(--blue-500)',
              fontWeight: 700,
              fontSize: 10.5,
              letterSpacing: '0.04em',
            }}>
              {progressLabel}
            </div>
          )}
        </div>

        <div style={{
          padding: '6px 12px',
          borderRadius: 999,
          background: completed ? 'var(--win-500)' : 'rgba(41,98,255,0.15)',
          color: completed ? 'white' : 'var(--blue-500)',
          fontSize: 13,
          fontWeight: 900,
          fontFamily: 'Archivo Black, sans-serif',
          whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Icon name="crown" size={11} color={completed ? 'white' : 'blue'} />
          {mission.reward}
        </div>
      </div>
    </div>
  )
}

// Mappe une mission à une icône SVG
function iconForMission(id) {
  switch (id) {
    case 'signup':           return 'check'
    case 'first_bet':        return 'add'
    case 'win':              return 'crown'
    case 'streak_3':         return 'sparkle'
    case 'login_7d':         return 'bell'
    case 'profile_complete': return 'user'
    default:                 return 'sparkle'
  }
}

// ============================================================
// ONGLET DÉPENSER — features achetables
// ============================================================
function SpendTab({ credits, onSpend }) {
  return (
    <div>
      <h3 className="h3 mb-3">Boutique premium</h3>

      <div className="space-y-2">
        {REWARDS_CATALOG.map(r => {
          const canAfford = credits >= r.cost
          return (
            <div key={r.id} className="card p-4" style={{
              opacity: canAfford ? 1 : 0.6,
            }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(41,98,255,0.12)',
                  border: '1px solid rgba(41,98,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon name={r.icon} size={20} color="blue" />
                </div>

                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg-1)' }}>{r.title}</div>
                  <div className="caption mt-0.5" style={{ fontSize: 12 }}>{r.description}</div>
                </div>

                <button
                  onClick={() => onSpend(r.id)}
                  disabled={!canAfford}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    background: canAfford ? 'var(--blue-500)' : 'var(--ink-700)',
                    color: canAfford ? 'white' : 'var(--fg-3)',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 900,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontFamily: 'Archivo Black, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon name="crown" size={12} color={canAfford ? 'white' : 'muted'} />
                  {r.cost}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// ONGLET ACHETER — packs Stripe (V2 disabled)
// ============================================================
function ShopTab() {
  return (
    <div>
      {/* Bandeau "disponible bientôt" */}
      <div className="card p-4 mb-4" style={{
        background: 'rgba(41,98,255,0.08)',
        borderColor: 'rgba(41,98,255,0.3)',
      }}>
        <div className="flex items-start gap-3">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(41,98,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="bell" size={18} color="blue" />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue-500)' }}>
              Disponible bientôt
            </div>
            <div className="caption mt-1" style={{ fontSize: 12 }}>
              L'achat de crédits par carte arrive avec la prochaine mise à jour.
            </div>
          </div>
        </div>
      </div>

      <h3 className="h3 mb-3">Packs de crédits</h3>

      <div className="space-y-2">
        {PURCHASE_PACKS.map(p => (
          <div key={p.id} className="card p-4 relative" style={{
            opacity: 0.6,
            borderColor: p.popular ? 'rgba(41,98,255,0.5)' : 'var(--ink-600)',
          }}>
            {p.popular && (
              <span style={{
                position: 'absolute', top: -8, right: 14,
                padding: '3px 10px', borderRadius: 6,
                background: 'var(--blue-500)', color: 'white',
                fontSize: 9, fontWeight: 900, letterSpacing: '0.15em',
                fontFamily: 'Archivo Black, sans-serif',
              }}>POPULAIRE</span>
            )}

            <div className="flex items-center justify-between mb-2">
              <div className="h3" style={{ fontSize: 16 }}>{p.title}</div>
              <div style={{
                fontFamily: 'Archivo Black, sans-serif',
                fontSize: 22, fontWeight: 900,
                color: 'var(--fg-1)',
              }}>{p.price}</div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Icon name="crown" size={14} color="gold" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>
                {p.credits} crédits
              </span>
              {p.bonus > 0 && (
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--win-500)' }}>
                  +{p.bonus} bonus
                </span>
              )}
            </div>

            <button disabled className="btn-ghost w-full" style={{
              cursor: 'not-allowed',
              opacity: 0.6,
              fontSize: 12,
            }}>
              Disponible bientôt
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// ONGLET HISTORIQUE — transactions
// ============================================================
function HistoryTab({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div style={{
          width: 56, height: 56,
          margin: '0 auto 16px',
          borderRadius: 16,
          background: 'var(--ink-700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chart_line" size={26} color="muted" />
        </div>
        <h3 className="h3 mb-1">Aucune activité</h3>
        <p className="body" style={{ fontSize: 13 }}>
          Tes gains et dépenses de crédits apparaîtront ici.
        </p>
      </div>
    )
  }

  const labelFor = (reason) => ({
    signup:           'Inscription',
    first_bet:        'Premier pari',
    win:              'Pari gagné',
    streak_3:         'Série de 3 victoires',
    login_7d:         'Connexion 7 jours',
    profile_complete: 'Profil complété',
    unlock_pro_1mo:   '1 mois Pro débloqué',
    unlock_sharp_1mo: '1 mois Sharp débloqué',
    lift_ocr_quota:   'Quota OCR levé',
    unlock_insight:   'Insight premium',
    custom_player:    'Joueur custom',
    challenge_win:    'Victoire de challenge',
    battle_win:       'Battle gagnée',
    battle_loss:      'Battle perdue',
    pick_vote_reward: 'Votes sur ton pick',
  })[reason] || reason

  return (
    <div className="space-y-2">
      {transactions.map(t => {
        const positive = t.amount >= 0
        return (
          <div key={t.id} className="card p-3 flex items-center gap-3">
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: positive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              border: positive ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {positive ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--win-500)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M 6 14 l 0 -8 m 0 0 l -3 3 m 3 -3 l 3 3" />
                  <path d="M 12 6 l 6 0" /><path d="M 12 11 l 4 0" /><path d="M 12 16 l 6 0" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--loss-500)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M 6 6 l 0 8 m 0 0 l -3 -3 m 3 3 l 3 -3" />
                  <path d="M 12 6 l 6 0" /><path d="M 12 11 l 4 0" /><path d="M 12 16 l 6 0" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>{labelFor(t.reason)}</div>
              <div className="caption mt-0.5" style={{ fontSize: 11 }}>
                {new Date(t.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 900,
              fontFamily: 'Archivo Black, sans-serif',
              color: positive ? 'var(--win-500)' : 'var(--loss-500)',
              whiteSpace: 'nowrap',
            }}>
              {positive ? '+' : ''}{t.amount}
            </div>
          </div>
        )
      })}
    </div>
  )
}
