import React, { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import BetCard from '../components/BetCard.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { TOURNAMENTS } from '../data/tournaments.js'
import { SURFACES } from '../data/players.js'
import {
  totalProfit, computeROI, computeWinRate,
  formatCurrencyPrecise, formatPercent,
} from '../utils/stats.js'

export default function TournamentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, settleBet, deleteBet } = useApp()
  const t = TOURNAMENTS.find(x => x.id === id)
  const bets = useMemo(() => (user?.bets || []).filter(b => b.tournamentId === id), [user, id])

  if (!t) {
    return (
      <>
        <TopBar showBack />
        <div className="px-5 pt-4 pb-24 text-center">
          <div className="card p-6"><p className="body">Tournoi introuvable.</p></div>
        </div>
      </>
    )
  }

  const surface = SURFACES.find(s => s.id === t.surface)
  const stats = {
    profit: totalProfit(bets),
    roi: computeROI(bets),
    winRate: computeWinRate(bets),
    count: bets.length,
    settled: bets.filter(b => b.status !== 'pending').length,
    wins: bets.filter(b => b.status === 'won').length,
    losses: bets.filter(b => b.status === 'lost').length,
  }

  return (
    <>
      <TopBar showBack />
      <div className="px-5 pt-2 pb-28">
        {/* Hero fiche tournoi */}
        <div className={t.isPrestige ? 'card-gold' : 'card'} style={{ padding: 20, marginBottom: 16 }}>
          <div className="flex items-center gap-4">
            <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 64, height: 64, background: t.isPrestige ? 'rgba(255,255,255,0.35)' : 'var(--ink-700)', fontSize: 32 }}>
              {t.flag}
            </div>
            <div className="flex-1 min-w-0">
              <div className="pill-label" style={{ fontSize: 18, color: t.isPrestige ? '#1a0f00' : 'var(--blue-500)' }}>{t.name}</div>
              <div className="caption mt-1" style={{ color: t.isPrestige ? '#3d2a00' : 'var(--fg-3)' }}>
                {t.category}
              </div>
              <div className="caption" style={{ color: t.isPrestige ? '#3d2a00' : 'var(--fg-3)' }}>
                {surface?.label || t.surface} · {t.dates}
              </div>
            </div>
            {t.isPrestige && <Icon name="crown" size={24} color="white" style={{ filter: 'none' }} />}
          </div>
        </div>

        {bets.length === 0 ? (
          <div className="card p-8 text-center">
            <Icon name="sparkle" size={32} color="muted" className="mx-auto mb-3" />
            <p className="body" style={{ color: 'var(--fg-1)' }}>Aucun pari sur ce tournoi.</p>
            <p className="caption mt-1">Ajoute ton premier pari pour suivre tes stats ici.</p>
            <button onClick={() => navigate('/add-bet')} className="btn-primary mt-4" style={{ width: 'auto', padding: '10px 18px' }}>
              Ajouter un pari
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <StatCard label="Profit" value={formatCurrencyPrecise(stats.profit)} positive={stats.profit >= 0} />
              <StatCard label="ROI" value={formatPercent(stats.roi)} positive={stats.roi >= 0} />
              <StatCard label="Paris" value={stats.count.toString()} neutral />
              <StatCard label="% réussis" value={`${stats.winRate.toFixed(0)}%`} positive={stats.winRate >= 50} />
            </div>

            <div className="card p-4 mb-5">
              <div className="field-label">Bilan</div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex-1 text-center">
                  <div className="stat-value" style={{ color: 'var(--win-500)', fontSize: 22 }}>{stats.wins}</div>
                  <div className="micro text-fg-3">gagnés</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="stat-value" style={{ color: 'var(--loss-500)', fontSize: 22 }}>{stats.losses}</div>
                  <div className="micro text-fg-3">perdus</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="stat-value" style={{ fontSize: 22 }}>{stats.count - stats.settled}</div>
                  <div className="micro text-fg-3">en cours</div>
                </div>
              </div>
            </div>

            <h2 className="h3 mb-3">Historique des paris</h2>
            <div className="space-y-2">
              {[...bets].sort((a, b) => new Date(b.date) - new Date(a.date)).map(b => (
                <div key={b.id} onClick={() => navigate(`/matchs/${b.id}`)} style={{ cursor: 'pointer' }}>
                  <BetCard bet={b} onSettle={settleBet} onDelete={deleteBet} showDate />
                </div>
              ))}
            </div>
          </>
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
