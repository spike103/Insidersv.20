import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { TOURNAMENTS } from '../data/tournaments.js'
import { SURFACES } from '../data/players.js'
import { betProfit, formatCurrencyPrecise } from '../utils/stats.js'

const ROUND_LABEL = {
  'R128': '1er tour', 'R64': '2e tour', 'R32': '3e tour',
  'R16': '1/8 de finale', 'QF': 'Quart de finale',
  'SF': 'Demi-finale', 'F': 'Finale', 'Qualif': 'Qualifications',
}

export default function MatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, findPlayer, settleBet, settleComboMatch, deleteBet } = useApp()
  const bet = (user?.bets || []).find(b => b.id === id)

  if (!bet) {
    return (
      <>
        <TopBar showBack />
        <div className="px-5 pt-4 pb-24 text-center">
          <div className="card p-6">
            <p className="body">Pari introuvable.</p>
            <button onClick={() => navigate('/matchs')} className="btn-primary mt-4" style={{ width: 'auto', padding: '10px 18px' }}>Retour aux matchs</button>
          </div>
        </div>
      </>
    )
  }

  const tournament = TOURNAMENTS.find(t => t.id === bet.tournamentId)
  const surface = SURFACES.find(s => s.id === bet.surface)
  const profit = betProfit(bet)
  const isLive = bet.betType === 'live' || bet.mode === 'live'
  const isCombo = bet.mode === 'combine'

  const statusLabel = {
    won: '✓ Gagné',
    lost: '✗ Perdu',
    pending: '⌛ En cours',
    void: '↺ Remboursé',
    cashout: 'Cashout',
  }[bet.status]

  const statusColor = {
    won: 'var(--win-500)',
    lost: 'var(--loss-500)',
    pending: 'var(--blue-500)',
    void: 'var(--fg-3)',
    cashout: 'var(--gold-400)',
  }[bet.status]

  const handleDelete = () => {
    if (confirm('Supprimer ce pari ?')) {
      deleteBet(bet.id)
      navigate('/matchs')
    }
  }

  return (
    <>
      <TopBar title="Détail du match" showBack />
      <div className="px-5 pt-2 pb-28">
        {/* Hero adapté : combiné vs simple */}
        {isCombo ? (
          <div className="card p-5 mb-4 animate-fade-in" style={{ background: 'linear-gradient(135deg, rgba(41,98,255,0.12), rgba(41,98,255,0.02))', borderColor: 'rgba(41,98,255,0.4)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="micro" style={{ color: 'var(--blue-500)', fontWeight: 700, letterSpacing: '0.15em' }}>COMBINÉ</div>
                <div className="h2" style={{ fontSize: 22, marginTop: 2 }}>
                  {bet.matches?.length || 0} matchs
                </div>
              </div>
              <div className="text-right">
                <div className="micro text-fg-3">Cote combinée</div>
                <div className="stat-value" style={{ color: 'var(--blue-500)', fontSize: 26 }}>{bet.odd?.toFixed(2)}</div>
              </div>
            </div>
            <div className="caption">Gain potentiel : <b style={{ color: 'var(--win-500)' }}>+{(bet.stake * (bet.odd - 1)).toFixed(2)} {user.currency}</b></div>
          </div>
        ) : (
          <div className="card p-5 mb-4 animate-fade-in" style={isLive ? { background: 'linear-gradient(135deg, rgba(41,98,255,0.18), rgba(41,98,255,0.05))', borderColor: 'var(--blue-500)', boxShadow: 'var(--glow-blue-soft)' } : {}}>
            {tournament && (
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: 18 }}>{tournament.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{tournament.name}</div>
                  <div className="micro text-fg-3">{tournament.dates}</div>
                </div>
                {isLive && (
                  <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 700, color: 'var(--loss-400)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--loss-400)' }} />
                    LIVE
                  </span>
                )}
              </div>
            )}
            <div className="space-y-2">
              {(bet.players || []).map((name, i) => {
                const p = findPlayer(name) || { flag: '🌍' }
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--ink-700)' }}>
                    <button
                      onClick={() => navigate(`/players/${encodeURIComponent(name)}`)}
                      className="flex items-center gap-2 min-w-0 flex-1"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: 18 }}>{p.flag || '🌍'}</span>
                      <span className="text-sm font-semibold truncate text-white">{name}</span>
                    </button>
                    {i === 0 && (
                      <span className="font-bold text-sm" style={{ color: 'var(--blue-500)' }}>{bet.odd?.toFixed(2)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Détails structurés */}
        <div className="card mb-4">
          <DetailRow label="Statut" value={statusLabel} color={statusColor} />
          <DetailRow label="Tournoi" value={tournament?.name || '—'} icon={tournament?.flag} />
          <DetailRow label="Catégorie" value={tournament?.category || '—'} badge={tournament?.isPrestige} />
          <DetailRow label="Surface" value={surface?.label || bet.surface || '—'} />
          <DetailRow label="Circuit" value={bet.tour || '—'} />
          {bet.round && <DetailRow label="Tour" value={ROUND_LABEL[bet.round] || bet.round} />}
          <DetailRow label="Type de pari" value={
            bet.betType === 'combine' ? `Combiné (${bet.matches?.length || 0} matchs)`
            : bet.betType === 'live' ? 'Live'
            : bet.betType === 'ml_p1' ? `Victoire ${bet.players?.[0] || 'Joueur 1'}`
            : bet.betType === 'ml_p2' ? `Victoire ${bet.players?.[1] || 'Joueur 2'}`
            : bet.betType === 'custom' && bet.customBetLabel ? bet.customBetLabel
            : (bet.betType || '—')
          } />
          <DetailRow label="Date" value={new Date(bet.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
          <DetailRow label="Mise" value={`${bet.stake.toFixed(2)} ${user.currency}${bet.stakeMode === 'pct' ? ` (${bet.stakePct}%)` : ''}`} />
          <DetailRow label="Cote" value={bet.odd?.toFixed(2)} />
          {bet.status !== 'pending' && (
            <DetailRow label="Résultat" value={formatCurrencyPrecise(profit)} color={profit >= 0 ? 'var(--win-500)' : profit < 0 ? 'var(--loss-500)' : 'var(--fg-3)'} noBorder />
          )}
        </div>

        {/* Combiné : liste détaillée des matchs */}
        {isCombo && bet.matches?.length > 0 && (
          <>
            <h3 className="h3 mb-3">Détail des {bet.matches.length} matchs</h3>
            <div className="space-y-3 mb-4">
              {bet.matches.map((m, i) => {
                const t = TOURNAMENTS.find(x => x.id === m.tournamentId)
                const p1 = m.players?.[0]
                const p2 = m.players?.[1]
                const p1Obj = p1 ? findPlayer(p1) : null
                const p2Obj = p2 ? findPlayer(p2) : null

                // Pick label
                let pickLabel = ''
                let pickPlayer = null
                if (m.betType === 'ml_p1' && p1) {
                  pickLabel = `Victoire ${p1}`
                  pickPlayer = p1Obj
                } else if (m.betType === 'ml_p2' && p2) {
                  pickLabel = `Victoire ${p2}`
                  pickPlayer = p2Obj
                } else if (m.betType === 'custom' && m.customBetLabel) {
                  pickLabel = m.customBetLabel
                }

                return (
                  <div key={i} className="card" style={{ padding: 14 }}>
                    {/* Header : Match N · Tour · Cote */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span style={{
                          padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(41,98,255,0.15)',
                          border: '1px solid rgba(41,98,255,0.35)',
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                          color: 'var(--blue-500)',
                        }}>
                          MATCH {i + 1}
                        </span>
                        {m.round && (
                          <span className="micro text-fg-3">{ROUND_LABEL[m.round] || m.round}</span>
                        )}
                      </div>
                      <span className="font-bold" style={{ color: 'var(--blue-500)', fontSize: 14 }}>@ {m.odd?.toFixed(2)}</span>
                    </div>

                    {/* Tournoi */}
                    {t && (
                      <div className="flex items-center gap-2 mb-3">
                        <span style={{ fontSize: 14 }}>{t.flag}</span>
                        <span className="caption" style={{ fontSize: 12 }}>{t.name} · {t.surface}</span>
                      </div>
                    )}

                    {/* Joueurs */}
                    {p1 && p2 && (
                      <div className="space-y-1.5 mb-3">
                        <div
                          className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{
                            background: m.betType === 'ml_p1' ? 'rgba(41,98,255,0.12)' : 'var(--ink-700)',
                            border: m.betType === 'ml_p1' ? '1px solid rgba(41,98,255,0.4)' : '1px solid transparent',
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span style={{ fontSize: 15 }}>{p1Obj?.flag || '🌍'}</span>
                            <span style={{ fontSize: 13, fontWeight: m.betType === 'ml_p1' ? 700 : 500, color: m.betType === 'ml_p1' ? 'var(--blue-500)' : 'var(--fg-1)' }} className="truncate">
                              {p1}
                            </span>
                          </div>
                          {m.betType === 'ml_p1' && (
                            <Icon name="check" size={14} color="blue" strokeWidth={3} />
                          )}
                        </div>
                        <div className="text-center micro text-fg-3" style={{ fontStyle: 'italic', fontSize: 10 }}>vs</div>
                        <div
                          className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{
                            background: m.betType === 'ml_p2' ? 'rgba(41,98,255,0.12)' : 'var(--ink-700)',
                            border: m.betType === 'ml_p2' ? '1px solid rgba(41,98,255,0.4)' : '1px solid transparent',
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span style={{ fontSize: 15 }}>{p2Obj?.flag || '🌍'}</span>
                            <span style={{ fontSize: 13, fontWeight: m.betType === 'ml_p2' ? 700 : 500, color: m.betType === 'ml_p2' ? 'var(--blue-500)' : 'var(--fg-1)' }} className="truncate">
                              {p2}
                            </span>
                          </div>
                          {m.betType === 'ml_p2' && (
                            <Icon name="check" size={14} color="blue" strokeWidth={3} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pick label — mis en avant */}
                    {pickLabel && (
                      <div style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(41,98,255,0.1), rgba(41,98,255,0.02))',
                        border: '1px solid rgba(41,98,255,0.3)',
                      }}>
                        <div className="micro" style={{ color: 'var(--blue-500)', fontWeight: 700, letterSpacing: '0.1em', fontSize: 9 }}>MON PICK</div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: 'var(--fg-1)' }}>
                          {pickLabel}
                        </div>
                      </div>
                    )}

                    {/* Statut individuel du match */}
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--ink-600)' }}>
                      <div className="micro mb-2" style={{ color: 'var(--fg-3)', fontWeight: 700, letterSpacing: '0.1em' }}>
                        STATUT DE CE MATCH
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'won', label: 'Gagné', color: 'var(--win-500)', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.5)' },
                          { id: 'pending', label: 'En cours', color: 'var(--fg-2)', bg: 'var(--ink-700)', border: 'var(--ink-600)' },
                          { id: 'lost', label: 'Perdu', color: 'var(--loss-500)', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.5)' },
                        ].map(opt => {
                          const active = (m.status || 'pending') === opt.id
                          return (
                            <button
                              key={opt.id}
                              onClick={() => settleComboMatch(bet.id, i, opt.id)}
                              style={{
                                padding: '8px 4px',
                                borderRadius: 8,
                                background: active ? opt.bg : 'var(--ink-800)',
                                border: active ? `1.5px solid ${opt.border}` : '1px solid var(--ink-600)',
                                color: active ? opt.color : 'var(--fg-2)',
                                fontSize: 11, fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Actions */}
        {bet.status === 'pending' && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => settleBet(bet.id, 'won')}
              className="btn-primary"
              style={{ background: 'var(--win-500)', boxShadow: 'none' }}
            >
              <Icon name="check" size={16} /> Gagné
            </button>
            <button
              onClick={() => settleBet(bet.id, 'lost')}
              className="btn-primary"
              style={{ background: 'var(--loss-500)', boxShadow: 'none' }}
            >
              <Icon name="close" size={16} /> Perdu
            </button>
          </div>
        )}

        <button onClick={handleDelete} className="btn-ghost w-full" style={{ color: 'var(--loss-400)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <Icon name="trash" size={14} /> Supprimer ce pari
        </button>
      </div>
    </>
  )
}

function DetailRow({ label, value, color, icon, badge, noBorder }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: noBorder ? 'none' : '1px solid var(--ink-600)' }}>
      <span className="field-label" style={{ marginBottom: 0 }}>{label}</span>
      <span className="flex items-center gap-2 text-right font-semibold text-sm" style={{ color: color || 'var(--fg-1)' }}>
        {icon && <span>{icon}</span>}
        <span>{value}</span>
        {badge && <Icon name="crown" size={14} color="gold" />}
      </span>
    </div>
  )
}
