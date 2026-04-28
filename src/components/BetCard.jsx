import React from 'react'
import Icon from './Icon.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { TOURNAMENTS } from '../data/tournaments.js'
import { SURFACES } from '../data/players.js'
import { betProfit, formatCurrencyPrecise } from '../utils/stats.js'

const ROUND_SHORT = {
  'R128': 'R128', 'R64': 'R64', 'R32': 'R32', 'R16': 'R16',
  'QF': 'QF', 'SF': 'SF', 'F': 'Finale', 'Qualif': 'Q',
}

function lastName(fullName) {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1]
}

function relativeDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff > 0 && diff < 7) return `${diff}d ago`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const STATUS_CONFIG = {
  won: { label: 'WON', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.5)', color: 'var(--win-500)' },
  lost: { label: 'LOST', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.5)', color: 'var(--loss-500)' },
  pending: { label: 'PENDING', bg: 'rgba(41,98,255,0.15)', border: 'rgba(41,98,255,0.5)', color: 'var(--blue-500)' },
  void: { label: 'VOID', bg: 'rgba(123,137,172,0.15)', border: 'rgba(123,137,172,0.5)', color: 'var(--fg-3)' },
  cashout: { label: 'CASHOUT', bg: 'rgba(240,224,128,0.18)', border: 'rgba(240,224,128,0.55)', color: 'var(--gold-400)' },
}

export default function BetCard({ bet, onSettle, onDelete, showDate = true }) {
  const { findPlayer } = useApp()
  const tournament = TOURNAMENTS.find(t => t.id === bet.tournamentId)
  const surface = SURFACES.find(s => s.id === bet.surface)
  const profit = betProfit(bet)
  const isLive = bet.betType === 'live' || bet.mode === 'live'
  const isCombo = bet.mode === 'combine' || bet.betType === 'combine'

  const status = STATUS_CONFIG[bet.status] || STATUS_CONFIG.pending

  // Affichage "Alcaraz vs. Rune" style
  const players = bet.players || []
  const p1 = players[0]
  const p2 = players[1]

  let matchTitle = ''
  if (isCombo && bet.matches?.length) {
    matchTitle = `Combiné · ${bet.matches.length} matchs`
  } else if (p1 && p2) {
    matchTitle = `${lastName(p1)} vs. ${lastName(p2)}`
  } else if (p1) {
    matchTitle = lastName(p1)
  } else {
    matchTitle = 'Pari'
  }

  // Subtitle : Tournoi · Round
  const subParts = []
  if (tournament) subParts.push(tournament.name.split(' ')[0]) // "Monte Carlo" depuis "Monte-Carlo Masters"
  if (bet.round) subParts.push(ROUND_SHORT[bet.round] || bet.round)
  if (surface && !tournament) subParts.push(surface.label)
  const subtitle = subParts.join(' · ')

  // Pick label
  let pickLabel = ''
  if (isCombo) {
    pickLabel = `Combo @ ${bet.odd?.toFixed(2)}`
  } else if (bet.betType === 'ml_p1' && p1) {
    pickLabel = `${lastName(p1)} ML @ ${bet.odd?.toFixed(2)}`
  } else if (bet.betType === 'ml_p2' && p2) {
    pickLabel = `${lastName(p2)} ML @ ${bet.odd?.toFixed(2)}`
  } else if (bet.customBetLabel) {
    pickLabel = `${bet.customBetLabel} @ ${bet.odd?.toFixed(2)}`
  } else {
    // default label
    const fallback = bet.betType === 'vainqueur' ? 'ML' : (bet.betType || 'Pick').replace('_', ' ')
    pickLabel = `${p1 ? lastName(p1) + ' ' : ''}${fallback} @ ${bet.odd?.toFixed(2)}`
  }

  return (
    <div className="card animate-fade-in" style={{ padding: 14, position: 'relative' }}>
      {/* Top row: status + date */}
      <div className="flex items-center justify-between mb-3">
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 999,
          background: status.bg, border: `1px solid ${status.border}`,
        }}>
          {isLive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--loss-400)' }} />}
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            color: status.color, textTransform: 'uppercase',
          }}>
            {isLive && bet.status === 'pending' ? 'LIVE' : status.label}
          </span>
        </div>
        {showDate && (
          <span className="micro text-fg-3" style={{ fontSize: 11 }}>{relativeDate(bet.date)}</span>
        )}
      </div>

      {/* Match title + subtitle */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--fg-1)', lineHeight: 1.2 }}>
          {matchTitle}
        </div>
        {subtitle && (
          <div className="micro text-fg-3" style={{ marginTop: 3, fontSize: 12 }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: 'var(--ink-600)', margin: '0 -14px 12px' }} />

      {/* Pick + P&L */}
      <div className="flex items-end justify-between">
        <div>
          <div className="micro text-fg-3" style={{ letterSpacing: '0.05em' }}>Pick</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-1)', marginTop: 2 }}>
            {pickLabel}
          </div>
        </div>
        <div className="text-right">
          <div className="micro text-fg-3" style={{ letterSpacing: '0.05em' }}>P&L</div>
          {bet.status === 'pending' ? (
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--blue-500)', marginTop: 2 }}>
              {bet.stake.toFixed(0)}€ → {(bet.stake * bet.odd).toFixed(0)}€
            </div>
          ) : (
            <div style={{ fontWeight: 700, fontSize: 18, color: status.color, marginTop: 2 }}>
              {formatCurrencyPrecise(profit)}
            </div>
          )}
        </div>
      </div>

      {/* Pending : small action row */}
      {bet.status === 'pending' && onSettle && (
        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--ink-600)' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onSettle(bet.id, 'won') }}
            style={{
              flex: 1, padding: '7px 10px', borderRadius: 8,
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
              color: 'var(--win-500)', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            <Icon name="check" size={12} strokeWidth={3} />
            Gagné
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSettle(bet.id, 'lost') }}
            style={{
              flex: 1, padding: '7px 10px', borderRadius: 8,
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
              color: 'var(--loss-500)', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            <Icon name="close" size={12} strokeWidth={3} />
            Perdu
          </button>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(bet.id) }}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--ink-700)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Supprimer"
            >
              <Icon name="trash" size={13} color="muted" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
