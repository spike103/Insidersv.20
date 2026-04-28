import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { TOURNAMENTS, tournamentsByMonth } from '../data/tournaments.js'
import { totalProfit, computeROI, formatCurrencyPrecise, formatPercent } from '../utils/stats.js'

const FLAG_MAP = {
  FRA:'🇫🇷',ESP:'🇪🇸',ITA:'🇮🇹',GER:'🇩🇪',USA:'🇺🇸',GBR:'🇬🇧',SRB:'🇷🇸',RUS:'🇷🇺',
  AUS:'🇦🇺',ARG:'🇦🇷',CAN:'🇨🇦',POL:'🇵🇱',NOR:'🇳🇴',CHN:'🇨🇳',JPN:'🇯🇵',MEX:'🇲🇽',
  SUI:'🇨🇭',AUT:'🇦🇹',NED:'🇳🇱',BEL:'🇧🇪',CZE:'🇨🇿',SVK:'🇸🇰',CRO:'🇭🇷',BUL:'🇧🇬',
  GRE:'🇬🇷',HUN:'🇭🇺',DEN:'🇩🇰',SWE:'🇸🇪',BRA:'🇧🇷',CHI:'🇨🇱',TUN:'🇹🇳',IND:'🇮🇳',
  BLR:'🇧🇾',UKR:'🇺🇦',KAZ:'🇰🇿',LAT:'🇱🇻',EST:'🇪🇪',ROU:'🇷🇴',ZAF:'🇿🇦',INT:'🌍',
}

export default function Tennis() {
  const [tab, setTab] = useState('players')
  return (
    <>
      <TopBar />
      <div className="px-5 pt-2 pb-28">
        <div className="segmented mb-5">
          <button onClick={() => setTab('players')} className={`seg-btn ${tab === 'players' ? 'active' : ''}`}>
            Joueurs
          </button>
          <button onClick={() => setTab('tournaments')} className={`seg-btn ${tab === 'tournaments' ? 'active' : ''}`}>
            Tournois
          </button>
        </div>
        {tab === 'players' ? <PlayersTab /> : <TournamentsTab />}
      </div>
    </>
  )
}

function PlayersTab() {
  const navigate = useNavigate()
  const { user, allPlayers, addCustomPlayer } = useApp()
  const [search, setSearch] = useState('')
  const [tour, setTour] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const bets = user?.bets || []

  const statsByPlayer = useMemo(() => {
    const map = {}
    bets.forEach(b => (b.players || []).forEach(p => {
      if (!map[p]) map[p] = []
      map[p].push(b)
    }))
    return map
  }, [bets])

  const list = useMemo(() => {
    let l = [...allPlayers]
    if (tour !== 'all') l = l.filter(p => p.tour === tour)
    if (search.trim()) {
      const q = search.toLowerCase()
      l = l.filter(p => p.name.toLowerCase().includes(q))
    }
    return l.sort((a, b) => {
      const aBets = (statsByPlayer[a.name] || []).length
      const bBets = (statsByPlayer[b.name] || []).length
      if (aBets !== bBets) return bBets - aBets
      return (a.rank || 999) - (b.rank || 999)
    })
  }, [allPlayers, tour, search, statsByPlayer])

  return (
    <>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher un joueur"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingRight: 44 }}
          />
          <Icon name="incognito" size={20} className="absolute right-4 top-1/2 -translate-y-1/2" color="muted" />
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-add" style={{ flexShrink: 0 }}>
          <Icon name="add" size={14} color="white" />
          Joueur
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {[{ id: 'all', label: 'Tous' }, { id: 'ATP', label: 'ATP' }, { id: 'WTA', label: 'WTA' }].map(t => (
          <button key={t.id} onClick={() => setTour(t.id)} className={`chip ${tour === t.id ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map(p => {
          const pBets = statsByPlayer[p.name] || []
          const profit = totalProfit(pBets)
          const roi = computeROI(pBets)
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/players/${encodeURIComponent(p.name)}`)}
              className="card w-full p-3 flex items-center gap-3 text-left"
              style={{ cursor: 'pointer' }}
            >
              <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, background: 'var(--ink-700)', fontSize: 20 }}>
                {p.flag || '🌍'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="pill-label text-blue" style={{ fontSize: 14 }}>{p.name}</span>
                  {p.custom && <span className="micro text-fg-3" style={{ fontStyle: 'italic' }}>perso</span>}
                </div>
                <div className="micro text-fg-3 mt-0.5">
                  {p.tour}{p.rank ? ` · #${p.rank}` : ''} · {p.country}
                </div>
              </div>
              {pBets.length > 0 ? (
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold" style={{ color: profit >= 0 ? 'var(--win-500)' : 'var(--loss-500)' }}>
                    {formatCurrencyPrecise(profit)}
                  </div>
                  <div className="micro text-fg-3">
                    {pBets.length} · {formatPercent(roi)}
                  </div>
                </div>
              ) : (
                <Icon name="chevron_right" size={16} color="muted" />
              )}
            </button>
          )
        })}
      </div>

      {showAdd && <AddPlayerModal onClose={() => setShowAdd(false)} onAdd={addCustomPlayer} />}
    </>
  )
}

function AddPlayerModal({ onClose, onAdd }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [country, setCountry] = useState('')
  const [tour, setTour] = useState('ATP')
  const [rank, setRank] = useState('')

  const canSubmit = firstName.trim() && lastName.trim()

  const submit = () => {
    if (!canSubmit) return
    const flag = country ? (FLAG_MAP[country.toUpperCase()] || '🌍') : '🌍'
    onAdd({ firstName, lastName, country: country.toUpperCase() || 'INT', tour, rank, flag })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)' }} />
      <div className="card relative w-full max-w-md animate-slide-up" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 20, maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="h2">Ajouter un joueur</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--ink-700)', border: 'none', cursor: 'pointer' }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Prénom</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Carlos" />
            </div>
            <div>
              <label className="field-label">Nom</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Alcaraz" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Pays (3 lettres)</label>
              <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 3))} placeholder="ESP" maxLength={3} />
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
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Annuler</button>
          <button onClick={submit} disabled={!canSubmit} className="btn-primary" style={{ flex: 1 }}>Ajouter</button>
        </div>
      </div>
    </div>
  )
}

function TournamentsTab() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const grouped = useMemo(() => {
    const all = tournamentsByMonth()
    if (!search.trim()) return all
    const q = search.toLowerCase()
    return all
      .map(g => ({ ...g, items: g.items.filter(t => t.name.toLowerCase().includes(q) || t.city.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0)
  }, [search])

  return (
    <>
      <div className="relative mb-5">
        <input
          type="text"
          placeholder="Rechercher un tournoi"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingRight: 44 }}
        />
        <Icon name="incognito" size={20} className="absolute right-4 top-1/2 -translate-y-1/2" color="muted" />
      </div>

      <div className="space-y-6">
        {grouped.map(g => (
          <div key={g.month}>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="h2">{g.label}</h2>
              <span className="caption">({g.items.length})</span>
            </div>
            <div className="space-y-2">
              {g.items.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/tournaments/${t.id}`)}
                  className={t.isPrestige ? 'card-gold' : 'card'}
                  style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, width: '100%', border: t.isPrestige ? 'none' : '1px solid var(--ink-600)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ fontWeight: 700, fontSize: 20, minWidth: 36, color: t.isPrestige ? '#1a0f00' : 'var(--fg-1)' }}>#{idx + 1}</div>
                  <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, background: t.isPrestige ? 'rgba(255,255,255,0.35)' : 'var(--ink-700)', fontSize: 18 }}>
                    {t.flag}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="pill-label truncate" style={{ fontSize: 15, color: t.isPrestige ? '#1a0f00' : 'var(--blue-500)' }}>
                      {t.name}
                    </div>
                    <div className="caption" style={{ color: t.isPrestige ? '#3d2a00' : 'var(--fg-3)' }}>
                      {t.category} · {t.dates}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
