import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import BetCard from '../components/BetCard.jsx'
import Icon from '../components/Icon.jsx'
import { useApp } from '../contexts/AppContext.jsx'

const STATUS_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'pending', label: 'En cours' },
  { id: 'won', label: 'Gagnés' },
  { id: 'lost', label: 'Perdus' },
  { id: 'live', label: 'Live' },
]

const DATE_FILTERS = [
  { id: 'all', label: 'Toutes dates' },
  { id: 'today', label: "Aujourd'hui" },
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'custom', label: 'Période…' },
]

function filterByDate(bets, filter, customFrom, customTo) {
  if (filter === 'all') return bets
  const now = Date.now()
  if (filter === 'today') {
    const today = new Date().toDateString()
    return bets.filter(b => new Date(b.date).toDateString() === today)
  }
  if (filter === '7d') {
    const cutoff = now - 7 * 86400000
    return bets.filter(b => new Date(b.date).getTime() >= cutoff)
  }
  if (filter === '30d') {
    const cutoff = now - 30 * 86400000
    return bets.filter(b => new Date(b.date).getTime() >= cutoff)
  }
  if (filter === 'custom') {
    return bets.filter(b => {
      const d = b.date.slice(0, 10)
      if (customFrom && d < customFrom) return false
      if (customTo && d > customTo) return false
      return true
    })
  }
  return bets
}

export default function Matchs() {
  const navigate = useNavigate()
  const { user, settleBet, deleteBet } = useApp()
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [customOpen, setCustomOpen] = useState(false)

  const bets = useMemo(() => {
    let list = [...(user?.bets || [])].sort((a, b) => new Date(b.date) - new Date(a.date))
    if (statusFilter === 'pending') list = list.filter(b => b.status === 'pending')
    else if (statusFilter === 'won') list = list.filter(b => b.status === 'won')
    else if (statusFilter === 'lost') list = list.filter(b => b.status === 'lost')
    else if (statusFilter === 'live') list = list.filter(b => b.betType === 'live' || b.mode === 'live')
    list = filterByDate(list, dateFilter, customFrom, customTo)
    return list
  }, [user, statusFilter, dateFilter, customFrom, customTo])

  const groups = useMemo(() => {
    const map = {}
    bets.forEach(b => {
      const d = new Date(b.date)
      const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      if (!map[key]) map[key] = { label: key, date: d, items: [] }
      map[key].items.push(b)
    })
    return Object.values(map).sort((a, b) => b.date - a.date)
  }, [bets])

  const pickDateFilter = (id) => {
    setDateFilter(id)
    if (id === 'custom') setCustomOpen(true)
    else setCustomOpen(false)
  }

  return (
    <>
      <TopBar title="Mes paris" />
      <div className="px-5 pt-2 pb-28">
        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 -mx-1 px-1">
          {STATUS_FILTERS.map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} className={`chip flex-shrink-0 ${statusFilter === f.id ? 'active' : ''}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Date filter chips — simple */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5 -mx-1 px-1">
          {DATE_FILTERS.map(f => {
            const active = dateFilter === f.id
            const isCustomActive = f.id === 'custom' && active && (customFrom || customTo)
            return (
              <button
                key={f.id}
                onClick={() => pickDateFilter(f.id)}
                className={`chip flex-shrink-0 ${active ? 'active' : ''}`}
                style={active ? { background: 'var(--blue-500)', borderColor: 'var(--blue-500)' } : {}}
              >
                <Icon name="calendar-clock" size={11} color="white" />
                {isCustomActive
                  ? `${customFrom ? customFrom.slice(5) : '…'} → ${customTo ? customTo.slice(5) : '…'}`
                  : f.label}
              </button>
            )
          })}
        </div>

        {/* Custom date popover */}
        {customOpen && (
          <div className="card p-4 mb-5 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="field-label" style={{ marginBottom: 0 }}>Période personnalisée</span>
              <button onClick={() => setCustomOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--ink-700)', border: 'none', cursor: 'pointer' }}>
                <Icon name="close" size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Du</label>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label className="field-label">Au</label>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
            {(customFrom || customTo) && (
              <button onClick={() => { setCustomFrom(''); setCustomTo('') }} className="btn-ghost mt-3" style={{ width: '100%', fontSize: 12, color: 'var(--loss-400)' }}>
                Effacer la période
              </button>
            )}
          </div>
        )}

        {groups.length === 0 ? (
          <div className="card p-8 text-center">
            <Icon name="match" size={40} color="muted" className="mx-auto mb-3" />
            <h3 className="h3 mb-1">Aucun pari</h3>
            <p className="body">Pas de pari dans cette période.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(g => (
              <div key={g.label}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="micro text-fg-3" style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{g.label}</h3>
                  <div className="flex-1 h-px" style={{ background: 'var(--ink-600)' }} />
                  <span className="micro text-fg-3">{g.items.length}</span>
                </div>
                <div className="space-y-2">
                  {g.items.map(bet => (
                    <div key={bet.id} onClick={() => navigate(`/matchs/${bet.id}`)} style={{ cursor: 'pointer' }}>
                      <BetCard bet={bet} onSettle={settleBet} onDelete={deleteBet} showDate />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
