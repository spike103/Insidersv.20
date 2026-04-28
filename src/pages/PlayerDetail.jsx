import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import BetCard from '../components/BetCard.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { TOURNAMENTS } from '../data/tournaments.js'
import {
  totalProfit, computeROI, computeWinRate,
  formatCurrencyPrecise, formatPercent,
} from '../utils/stats.js'

const FLAG_MAP = {
  FRA:'🇫🇷',ESP:'🇪🇸',ITA:'🇮🇹',GER:'🇩🇪',USA:'🇺🇸',GBR:'🇬🇧',SRB:'🇷🇸',RUS:'🇷🇺',
  AUS:'🇦🇺',ARG:'🇦🇷',CAN:'🇨🇦',POL:'🇵🇱',NOR:'🇳🇴',CHN:'🇨🇳',JPN:'🇯🇵',MEX:'🇲🇽',
  SUI:'🇨🇭',AUT:'🇦🇹',NED:'🇳🇱',BEL:'🇧🇪',CZE:'🇨🇿',SVK:'🇸🇰',CRO:'🇭🇷',BUL:'🇧🇬',
  GRE:'🇬🇷',HUN:'🇭🇺',DEN:'🇩🇰',SWE:'🇸🇪',BRA:'🇧🇷',CHI:'🇨🇱',TUN:'🇹🇳',IND:'🇮🇳',
  BLR:'🇧🇾',UKR:'🇺🇦',KAZ:'🇰🇿',LAT:'🇱🇻',EST:'🇪🇪',ROU:'🇷🇴',ZAF:'🇿🇦',INT:'🌍',
}

export default function PlayerDetail() {
  const { name } = useParams()
  const navigate = useNavigate()
  const { user, findPlayer, settleBet, deleteBet, updateCustomPlayer, removeCustomPlayer } = useApp()
  const decodedName = decodeURIComponent(name || '')
  const player = findPlayer(decodedName)
  const [editOpen, setEditOpen] = useState(false)

  const bets = useMemo(() => (user?.bets || []).filter(b => (b.players || []).includes(decodedName)),
    [user, decodedName])

  const stats = useMemo(() => ({
    profit: totalProfit(bets),
    roi: computeROI(bets),
    winRate: computeWinRate(bets),
    count: bets.length,
    settled: bets.filter(b => b.status !== 'pending').length,
    wins: bets.filter(b => b.status === 'won').length,
    losses: bets.filter(b => b.status === 'lost').length,
  }), [bets])

  const byTournament = useMemo(() => {
    const map = {}
    bets.forEach(b => {
      const key = b.tournamentId || '__other__'
      if (!map[key]) map[key] = []
      map[key].push(b)
    })
    return Object.entries(map).map(([tid, list]) => {
      const t = TOURNAMENTS.find(x => x.id === tid)
      return {
        tournamentId: tid === '__other__' ? null : tid,
        tournament: t || { name: 'Autre', flag: '🎾', category: '—' },
        bets: list,
        profit: totalProfit(list),
        roi: computeROI(list),
        count: list.length,
      }
    }).sort((a, b) => b.profit - a.profit)
  }, [bets])

  if (!player) {
    return (
      <>
        <TopBar showBack />
        <div className="px-5 pt-4 pb-24 text-center">
          <div className="card p-6"><p className="body">Joueur introuvable.</p></div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar showBack />
      <div className="px-5 pt-2 pb-28">
        {/* Hero profil */}
        <div className="card p-5 mb-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 64, height: 64, background: 'var(--ink-700)', fontSize: 32 }}>
              {player.flag || '🌍'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="pill-label text-blue" style={{ fontSize: 18 }}>{player.name}</div>
              <div className="caption mt-1">
                {player.tour}{player.rank ? ` · #${player.rank} mondial` : ''} · {player.country || 'INT'}
                {player.custom && ' · Perso'}
              </div>
            </div>
            {player.custom && (
              <button onClick={() => setEditOpen(true)} className="btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>
                <Icon name="edit" size={13} />
                Modifier
              </button>
            )}
          </div>
        </div>

        {bets.length === 0 ? (
          <div className="card p-8 text-center animate-fade-in">
            <Icon name="sparkle" size={32} color="muted" className="mx-auto mb-3" />
            <p className="body" style={{ color: 'var(--fg-1)' }}>Aucun pari enregistré sur ce joueur.</p>
            <p className="caption mt-1">Ajoute ton premier pari pour commencer à suivre tes stats.</p>
            <button onClick={() => navigate('/add-bet')} className="btn-primary mt-4" style={{ width: 'auto', padding: '10px 18px' }}>
              Ajouter un pari
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-4 animate-fade-in">
              <StatCard label="Profit total" value={formatCurrencyPrecise(stats.profit)} positive={stats.profit >= 0} />
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

            <h2 className="h3 mb-3">Tournois</h2>
            <div className="space-y-2 mb-6">
              {byTournament.map((t, i) => {
                const clickable = !!t.tournamentId
                const content = (
                  <>
                    <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, background: 'var(--ink-700)', fontSize: 16 }}>
                      {t.tournament.flag}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h3 truncate" style={{ fontSize: 14 }}>{t.tournament.name}</div>
                      <div className="micro text-fg-3">{t.count} pari{t.count > 1 ? 's' : ''} · {t.tournament.category}</div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div className="font-bold" style={{ color: t.profit >= 0 ? 'var(--win-500)' : 'var(--loss-500)', fontSize: 14 }}>
                          {formatCurrencyPrecise(t.profit)}
                        </div>
                        <div className="micro text-fg-3">{formatPercent(t.roi)}</div>
                      </div>
                      {clickable && <Icon name="chevron_right" size={14} color="muted" />}
                    </div>
                  </>
                )
                return clickable ? (
                  <button
                    key={i}
                    onClick={() => navigate(`/tournaments/${t.tournamentId}`)}
                    className="card p-3 flex items-center gap-3 w-full text-left"
                    style={{ cursor: 'pointer' }}
                  >
                    {content}
                  </button>
                ) : (
                  <div key={i} className="card p-3 flex items-center gap-3">
                    {content}
                  </div>
                )
              })}
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

      {editOpen && player.custom && (
        <EditPlayerModal
          player={player}
          onClose={() => setEditOpen(false)}
          onSave={(patch) => { updateCustomPlayer(player.id, patch); setEditOpen(false) }}
          onDelete={() => {
            if (confirm('Supprimer ce joueur ? Tes paris existants resteront.')) {
              removeCustomPlayer(player.id)
              navigate(-1)
            }
          }}
        />
      )}
    </>
  )
}

function EditPlayerModal({ player, onClose, onSave, onDelete }) {
  const [firstName, setFirstName] = useState(player.name.split(' ')[0] || '')
  const [lastName, setLastName] = useState(player.name.split(' ').slice(1).join(' ') || '')
  const [country, setCountry] = useState(player.country || '')
  const [rank, setRank] = useState(player.rank ? String(player.rank) : '')
  const [tour, setTour] = useState(player.tour || 'ATP')

  const save = () => {
    const newName = `${firstName.trim()} ${lastName.trim()}`.trim()
    const c = country.toUpperCase().slice(0, 3) || 'INT'
    onSave({
      name: newName || player.name,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      country: c,
      flag: FLAG_MAP[c] || '🌍',
      rank: rank ? Number(rank) : null,
      tour,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)' }} />
      <div className="card relative w-full max-w-md animate-slide-up" style={{
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
        padding: 20, maxHeight: '90vh', overflowY: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="h2">Modifier le joueur</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--ink-700)', border: 'none', cursor: 'pointer' }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Prénom</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Nom</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Pays (3 lettres)</label>
              <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 3))} maxLength={3} placeholder="ESP" />
            </div>
            <div>
              <label className="field-label">Classement</label>
              <input type="number" value={rank} onChange={(e) => setRank(e.target.value)} placeholder="42" />
            </div>
          </div>
          <div>
            <label className="field-label">Circuit</label>
            <select value={tour} onChange={(e) => setTour(e.target.value)}>
              <option value="ATP">ATP</option>
              <option value="WTA">WTA</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onDelete} className="btn-ghost" style={{ flex: 1, color: 'var(--loss-400)', borderColor: 'rgba(239,68,68,0.3)' }}>
            <Icon name="trash" size={14} /> Supprimer
          </button>
          <button onClick={save} className="btn-primary" style={{ flex: 2 }}>Enregistrer</button>
        </div>
      </div>
    </div>
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
