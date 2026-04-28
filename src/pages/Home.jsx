import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import BetCard from '../components/BetCard.jsx'
import { MonthlyBar, InteractiveROICurve } from '../components/Charts.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { TOURNAMENTS } from '../data/tournaments.js'
import { SURFACES } from '../data/players.js'
import {
  computeROI, computeWinRate, totalProfit, averageStake, filterBets,
  findWeakestArea, findStrongestArea,
  formatPercent, formatCurrency, formatCurrencyPrecise, betProfit,
} from '../utils/stats.js'

const TIMEFRAMES = [
  { id: 'month', label: 'Ce mois-ci' },
  { id: '7d', label: '7 jours' },
  { id: '90d', label: '90 jours' },
  { id: '365d', label: '1 an' },
]

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lundi' }, { id: 2, label: 'Mardi' }, { id: 3, label: 'Mercredi' },
  { id: 4, label: 'Jeudi' }, { id: 5, label: 'Vendredi' }, { id: 6, label: 'Samedi' }, { id: 0, label: 'Dimanche' },
]

function filterBetsExtended(bets, filters) {
  return bets.filter(b => {
    if (filters.category) {
      const t = TOURNAMENTS.find(x => x.id === b.tournamentId)
      if (!t || !t.category.includes(filters.category)) return false
    }
    if (filters.surface && b.surface !== filters.surface) return false
    if (filters.tour && b.tour !== filters.tour) return false
    if (filters.betType && b.betType !== filters.betType) return false
    if (filters.dayOfWeek != null && new Date(b.date).getDay() !== filters.dayOfWeek) return false
    if (filters.minOdd != null && b.odd < filters.minOdd) return false
    if (filters.maxOdd != null && b.odd > filters.maxOdd) return false
    if (filters.minStake != null && b.stake < filters.minStake) return false
    if (filters.maxStake != null && b.stake > filters.maxStake) return false
    return true
  })
}

// Génère les données mensuelles profit sur 6 mois glissants
function computeMonthlyProfit(bets, monthsBack = 6) {
  const now = new Date()
  const months = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase().slice(0, 3),
      date: d,
      profit: 0,
    })
  }
  bets.forEach(b => {
    if (b.status === 'pending' || b.status === 'void') return
    const d = new Date(b.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const m = months.find(mm => mm.key === key)
    if (m) m.profit += betProfit(b)
  })
  return months
}

// Points bankroll pour la courbe interactive
function bankrollPoints(bets, bankrollStart) {
  const sorted = [...bets].filter(b => b.status !== 'pending').sort((a, b) => new Date(a.date) - new Date(b.date))
  if (sorted.length === 0) return []
  const points = [{ value: bankrollStart, delta: 0, label: 'Départ' }]
  let running = bankrollStart
  sorted.forEach(b => {
    running += betProfit(b)
    points.push({
      value: running,                       // pour le tracé de la courbe (bankroll absolue)
      delta: running - bankrollStart,       // pour l'affichage du label (bénéfice net)
      label: new Date(b.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    })
  })
  return points
}

export default function Home() {
  const navigate = useNavigate()
  const { user, ignoreAlert, settleBet, deleteBet, notifications } = useApp()
  const [view, setView] = useState('overview')
  const [timeframe, setTimeframe] = useState('month')
  const [filters, setFilters] = useState({})
  const [shareOpen, setShareOpen] = useState(false)

  const allBets = user?.bets || []
  const timed = useMemo(() => filterBets(allBets, { timeframe }), [allBets, timeframe])
  const filtered = useMemo(() => filterBetsExtended(timed, filters), [timed, filters])

  const stats = useMemo(() => ({
    roi: computeROI(filtered),
    profit: totalProfit(filtered),
    winRate: computeWinRate(filtered),
    count: filtered.filter(b => b.status !== 'pending').length,
    avg: averageStake(filtered),
  }), [filtered])

  const weakest = useMemo(() => findWeakestArea(filtered).slice(0, 2), [filtered])
  const strongest = useMemo(() => findStrongestArea(filtered).slice(0, 1), [filtered])

  const bankrollNow = (user?.bankrollStart || 0) + totalProfit(allBets)
  const brPoints = useMemo(() => bankrollPoints(allBets, user?.bankrollStart || 0), [allBets, user])
  const monthly = useMemo(() => computeMonthlyProfit(allBets, 6), [allBets])
  const hasFilters = Object.keys(filters).length > 0

  // Insights : cap à 3, les plus récents (ordre de génération dans AppContext — on prend les 3 derniers)
  const visibleInsights = useMemo(() => {
    if (!notifications || notifications.length === 0) return []
    // Rotation FIFO : on garde les 3 derniers (les plus récents en bas de liste)
    return notifications.slice(-3)
  }, [notifications])

  const isEmpty = allBets.length === 0

  return (
    <>
      <TopBar />
      <div className="px-5 pt-2 pb-28">
        <div className="flex items-center justify-between mb-4">
          <h1 className="h1">
            Salut, <span className="accent-word">{user.firstName || user.pseudo}</span> !
          </h1>
          <button onClick={() => navigate('/add-bet')} className="btn-add">
            <Icon name="add" size={14} color="white" /> Ajouter
          </button>
        </div>

        {isEmpty && (
          <div
            className="card mb-4"
            style={{
              padding: 14,
              background: 'linear-gradient(135deg, rgba(41,98,255,0.12), rgba(41,98,255,0.03))',
              borderColor: 'rgba(41,98,255,0.4)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(41,98,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name="sparkle" size={20} color="blue" />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue-500)' }}>
                Ajoute ton premier pari
              </div>
              <div className="caption" style={{ fontSize: 11, marginTop: 2 }}>
                Tes stats, insights et leaderboard apparaîtront ici.
              </div>
            </div>
            <button onClick={() => navigate('/add-bet')} className="btn-primary" style={{ width: 'auto', padding: '8px 14px', fontSize: 12 }}>
              Ajouter
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide -mx-1 px-1">
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="chip" style={{ width: 'auto', paddingRight: 30, flexShrink: 0 }}>
            {TIMEFRAMES.map(t => <option key={t.id} value={t.id} style={{ background: 'var(--ink-800)' }}>{t.label}</option>)}
          </select>
          <button onClick={() => setShareOpen(true)} className="chip" style={{ flexShrink: 0 }}>
            <Icon name="share" size={12} color="white" />
            Partager
          </button>
          <button onClick={() => navigate('/friends')} className="chip" style={{ flexShrink: 0 }}>
            <Icon name="incognito" size={12} color="white" />
            Amis
          </button>
          <button onClick={() => navigate('/leaderboard')} className="chip" style={{ flexShrink: 0 }}>
            <Icon name="crown" size={12} color="white" />
            Classement
          </button>
        </div>

        <div className="segmented mb-4">
          <button onClick={() => setView('overview')} className={`seg-btn ${view === 'overview' ? 'active' : ''}`}>Vue d'ensemble</button>
          <button onClick={() => setView('performance')} className={`seg-btn ${view === 'performance' ? 'active' : ''}`}>Performance</button>
        </div>

        {view === 'performance' && <FilterPanel filters={filters} setFilters={setFilters} user={user} />}

        {view === 'overview' ? (
          <OverviewSection stats={stats} bankrollNow={bankrollNow} user={user} brPoints={brPoints} monthly={monthly} />
        ) : (
          <PerformanceSection stats={stats} weakest={weakest} strongest={strongest} filtered={filtered} user={user} hasFilters={hasFilters} />
        )}

        {/* Insights — tous affichés */}
        {visibleInsights.length > 0 && (
          <div className="mt-6">
            <h2 className="h3 mb-3">
              Insights personnalisés
              {notifications.length > 3 && (
                <span className="micro text-fg-3" style={{ fontWeight: 500, marginLeft: 6 }}>
                  · {visibleInsights.length} sur {notifications.length}
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {visibleInsights.map(insight => (
                <InsightCardWrapper
                  key={insight.id}
                  insight={insight}
                  user={user}
                  onIgnore={() => ignoreAlert(insight.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Paris récents */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="h3">Paris récents</h2>
            <button onClick={() => navigate('/matchs')} className="micro" style={{ color: 'var(--blue-500)', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
              Voir tout →
            </button>
          </div>
          <div className="space-y-2">
            {[...allBets].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).map(b => (
              <div key={b.id} onClick={() => navigate(`/matchs/${b.id}`)} style={{ cursor: 'pointer' }}>
                <BetCard bet={b} onSettle={settleBet} onDelete={deleteBet} showDate />
              </div>
            ))}
          </div>
        </div>
      </div>

      {shareOpen && <ShareModal stats={stats} user={user} onClose={() => setShareOpen(false)} />}
    </>
  )
}

// ========== INSIGHT CARD ==========
function InsightCardWrapper(props) {
  const { updateUser, user } = useApp()
  const activate = () => {
    const activated = user.alertsActivated || []
    updateUser({ alertsActivated: [...activated.filter(a => a !== props.insight.id), props.insight.id] })
  }
  return <InsightCardInner {...props} onActivate={activate} />
}

function InsightCardInner({ insight, user, onActivate, onIgnore }) {
  const isActivated = (user?.alertsActivated || []).includes(insight.id)
  const isWarning = insight.kind === 'warning'

  return (
    <div
      className={isWarning ? 'card-gold' : 'card'}
      style={{
        padding: 16,
        color: isWarning ? '#1a0f00' : 'var(--fg-1)',
        borderColor: isWarning ? undefined : (insight.kind === 'success' ? 'rgba(34,197,94,0.4)' : 'var(--ink-600)'),
        background: isWarning ? undefined : (insight.kind === 'success' ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.02))' : 'var(--ink-800)'),
        position: 'relative',
      }}
    >
      {/* Close X */}
      <button
        onClick={onIgnore}
        aria-label="Masquer"
        style={{
          position: 'absolute', top: 10, right: 10,
          width: 26, height: 26, borderRadius: '50%',
          background: isWarning ? 'rgba(26,15,0,0.15)' : 'rgba(255,255,255,0.08)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={isWarning ? '#1a0f00' : 'var(--fg-3)'} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 mb-3" style={{ paddingRight: 30 }}>
        <Icon
          name={isWarning ? 'sparkle' : insight.kind === 'success' ? 'trending_up' : 'bell'}
          size={20}
          color={isWarning ? 'white' : insight.kind === 'success' ? 'green' : 'blue'}
          style={isWarning ? { filter: 'none', flexShrink: 0 } : { flexShrink: 0 }}
        />
        <div className="flex-1 min-w-0">
          <div className="micro" style={{
            color: isWarning ? '#3d2a00' : (insight.kind === 'success' ? 'var(--win-400)' : 'var(--blue-500)'),
            fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4,
          }}>
            {isActivated ? 'ALERTE ACTIVÉE' : 'INSIGHT PERSONNALISÉ'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{insight.title}</div>
          <p className="body" style={{ color: isWarning ? '#1a0f00' : 'var(--fg-2)', fontSize: 13 }}>{insight.body}</p>
        </div>
      </div>

      {!isActivated ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onActivate}
            className="btn-primary"
            style={{
              flex: 1, padding: '10px', fontSize: 13,
              ...(isWarning ? { background: '#1a0f00', color: '#f0c85a', boxShadow: 'none' } : {}),
            }}
          >
            Activer l'alerte
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2" style={{
          padding: '8px 12px', borderRadius: 8,
          background: isWarning ? 'rgba(26,15,0,0.1)' : 'rgba(34,197,94,0.08)',
          border: isWarning ? '1px solid rgba(26,15,0,0.25)' : '1px solid rgba(34,197,94,0.3)',
        }}>
          <Icon name="check" size={14} color={isWarning ? 'white' : 'green'} style={isWarning ? { filter: 'none' } : {}} strokeWidth={3} />
          <span className="micro" style={{ fontWeight: 700, color: isWarning ? '#1a0f00' : 'var(--win-500)' }}>
            Tu seras notifié·e si ce schéma se reproduit
          </span>
        </div>
      )}
    </div>
  )
}

// ========== OVERVIEW ==========
function OverviewSection({ stats, bankrollNow, user, brPoints, monthly }) {
  return (
    <div className="animate-fade-in">
      {/* Bankroll card with interactive chart */}
      <div className="card p-5 mb-3" style={{
        background: 'linear-gradient(135deg, rgba(41,98,255,0.15), rgba(41,98,255,0.02))',
        borderColor: 'rgba(41,98,255,0.4)',
      }}>
        <div className="flex items-center justify-between mb-1">
          <span className="field-label" style={{ marginBottom: 0 }}>Bankroll actuelle</span>
          <Icon name="coins" size={18} color="gold" />
        </div>
        <div className="stat-value mb-1" style={{ fontSize: 40 }}>
          {bankrollNow.toFixed(0)} <span style={{ fontSize: 22 }}>{user.currency}</span>
        </div>
        <div className="caption mb-3">Capital initial : <b style={{ color: 'white' }}>{user.bankrollStart} {user.currency}</b></div>
        {brPoints.length >= 2 && (
          <InteractiveROICurve
            points={brPoints}
            height={160}
            color={stats.profit >= 0 ? '#22c55e' : '#ef4444'}
            currency={user.currency}
          />
        )}
        <div className="caption text-center mt-2" style={{ color: 'var(--fg-3)', fontSize: 10 }}>
          Touche les points hauts et bas pour voir les valeurs
        </div>
      </div>

      {/* Monthly profit chart */}
      <div className="card p-4 mb-3">
        <div className="micro text-fg-3" style={{ letterSpacing: '0.08em', fontWeight: 600, marginBottom: 12 }}>Monthly profit</div>
        <MonthlyBar data={monthly} height={130} currency={user.currency} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <KPI label="ROI global" value={formatPercent(stats.roi)} positive={stats.roi >= 0} />
        <KPI label="Profit total" value={formatCurrency(stats.profit, user.currency)} positive={stats.profit >= 0} />
        <KPI label="Taux de victoire" value={`${stats.winRate.toFixed(1)}%`} positive={stats.winRate >= 50} />
        <KPI label="Total paris" value={stats.count.toString()} neutral />
      </div>
      <div className="card p-3 mt-2 flex items-center justify-between">
        <span className="field-label" style={{ marginBottom: 0 }}>Mise moyenne</span>
        <span className="stat-value" style={{ fontSize: 22 }}>{stats.avg.toFixed(1)} {user.currency}</span>
      </div>
    </div>
  )
}

function KPI({ label, value, positive, neutral }) {
  const color = neutral ? 'var(--fg-1)' : positive ? 'var(--win-500)' : 'var(--loss-500)'
  return (
    <div className="card p-3">
      <div className="field-label" style={{ marginBottom: 6 }}>{label}</div>
      <div className="stat-value" style={{ color, fontSize: 24 }}>{value}</div>
    </div>
  )
}

// ========== FILTERS ==========
function FilterPanel({ filters, setFilters, user }) {
  const [open, setOpen] = useState(false)
  const count = Object.keys(filters).length

  const setF = (k, v) => {
    const next = { ...filters }
    if (v === null || v === undefined || v === '') delete next[k]
    else next[k] = v
    setFilters(next)
  }
  const clear = () => setFilters({})

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setOpen(!open)} className="chip">
          <Icon name="filter" size={12} color="white" />
          Filtres{count > 0 ? ` · ${count}` : ''}
          <Icon name="chevron_down" size={10} />
        </button>
        {count > 0 && (
          <button onClick={clear} className="micro" style={{ color: 'var(--loss-500)', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Tout effacer</button>
        )}
      </div>

      {open && (
        <div className="card p-4 space-y-3 animate-slide-up">
          <Row label="Catégorie tournoi">
            <select value={filters.category || ''} onChange={(e) => setF('category', e.target.value)}>
              <option value="">Toutes</option>
              <option value="Grand Chelem">Grand Chelem</option>
              <option value="Masters 1000">Masters 1000</option>
              <option value="WTA 1000">WTA 1000</option>
              <option value="ATP 500">ATP 500</option>
              <option value="WTA 500">WTA 500</option>
              <option value="ATP 250">ATP 250</option>
              <option value="WTA 250">WTA 250</option>
              <option value="Finales">Finales</option>
            </select>
          </Row>
          <Row label="Surface">
            <select value={filters.surface || ''} onChange={(e) => setF('surface', e.target.value)}>
              <option value="">Toutes</option>
              {SURFACES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Row>
          <Row label="Circuit">
            <select value={filters.tour || ''} onChange={(e) => setF('tour', e.target.value)}>
              <option value="">Tous</option>
              <option value="ATP">ATP</option>
              <option value="WTA">WTA</option>
            </select>
          </Row>
          <Row label="Type de pari">
            <select value={filters.betType || ''} onChange={(e) => setF('betType', e.target.value)}>
              <option value="">Tous</option>
              <option value="ml_p1">ML Joueur 1</option>
              <option value="ml_p2">ML Joueur 2</option>
              <option value="custom">Personnalisé</option>
              <option value="live">Live</option>
              <option value="combine">Combiné</option>
            </select>
          </Row>
          <Row label="Jour de semaine">
            <select value={filters.dayOfWeek ?? ''} onChange={(e) => setF('dayOfWeek', e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">Tous</option>
              {DAYS_OF_WEEK.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Cote min">
              <input type="number" step="0.1" placeholder="1.0" value={filters.minOdd ?? ''} onChange={(e) => setF('minOdd', e.target.value ? Number(e.target.value) : null)} />
            </Row>
            <Row label="Cote max">
              <input type="number" step="0.1" placeholder="5.0" value={filters.maxOdd ?? ''} onChange={(e) => setF('maxOdd', e.target.value ? Number(e.target.value) : null)} />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Row label={`Mise min (${user.currency})`}>
              <input type="number" placeholder="0" value={filters.minStake ?? ''} onChange={(e) => setF('minStake', e.target.value ? Number(e.target.value) : null)} />
            </Row>
            <Row label={`Mise max (${user.currency})`}>
              <input type="number" placeholder="100" value={filters.maxStake ?? ''} onChange={(e) => setF('maxStake', e.target.value ? Number(e.target.value) : null)} />
            </Row>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <div className="field-label" style={{ marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

// ========== PERFORMANCE ==========
function PerformanceSection({ stats, weakest, strongest, filtered, user, hasFilters }) {
  const [tab, setTab] = useState('weakness')
  return (
    <div className="animate-fade-in">
      <div className="card p-4 mb-4" style={{
        background: stats.profit < 0 ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.02))' : 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.02))',
        borderColor: stats.profit < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
      }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="field-label" style={{ marginBottom: 2 }}>{hasFilters ? 'Résultat filtré' : 'Période'}</div>
            <div className="stat-value" style={{ color: stats.profit < 0 ? 'var(--loss-500)' : 'var(--win-500)' }}>{formatCurrencyPrecise(stats.profit)}</div>
          </div>
          <div className="text-right">
            <div className="field-label" style={{ marginBottom: 2 }}>{filtered.length} paris</div>
            <div className="h3" style={{ color: stats.roi < 0 ? 'var(--loss-500)' : 'var(--win-500)' }}>ROI {formatPercent(stats.roi)}</div>
          </div>
        </div>
        <div className="caption">Taux de victoire : <b style={{ color: 'white' }}>{stats.winRate.toFixed(1)}%</b></div>
      </div>

      <div className="segmented mb-4">
        <button onClick={() => setTab('strengths')} className={`seg-btn ${tab === 'strengths' ? 'active' : ''}`} style={tab === 'strengths' ? { background: 'var(--win-500)' } : {}}>
          <Icon name="trending_up" size={14} color="white" /> Forces
        </button>
        <button onClick={() => setTab('weakness')} className={`seg-btn ${tab === 'weakness' ? 'active' : ''}`} style={tab === 'weakness' ? { background: 'var(--loss-500)' } : {}}>
          <Icon name="trending_down" size={14} color="white" /> Faiblesses
        </button>
      </div>

      {tab === 'weakness' ? (
        weakest.length > 0 ? <div className="space-y-2">{weakest.map((w, i) => <SWCard key={i} item={w} negative />)}</div>
        : <div className="card p-5 text-center caption">Pas encore de faiblesse claire.</div>
      ) : (
        strongest.length > 0 ? <div className="space-y-2">{strongest.map((s, i) => <SWCard key={i} item={s} />)}</div>
        : <div className="card p-5 text-center caption">Pas encore assez de données pour identifier tes forces.</div>
      )}
    </div>
  )
}

function SWCard({ item, negative }) {
  const kindLabel = { tour: 'circuit', surface: 'surface', betType: 'type' }[item.kind]
  const color = negative ? 'var(--loss-500)' : 'var(--win-500)'
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${color}22` }}>
            <Icon name={negative ? 'trending_down' : 'trending_up'} size={16} style={{ stroke: color, color }} />
          </div>
          <div>
            <div className="micro text-fg-3">{negative ? 'Pire' : 'Meilleur'} {kindLabel}</div>
            <div className="h3" style={{ fontSize: 15 }}>{item.label}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="stat-value" style={{ color, fontSize: 22 }}>{formatCurrencyPrecise(item.profit)}</div>
          <div className="micro text-fg-3">{item.count} paris</div>
        </div>
      </div>
      <div className="caption">
        ROI = <b style={{ color }}>{formatPercent(item.roi)}</b> · {negative ? 'Taux de perte' : 'Taux de victoire'} : <b>{negative ? (100 - item.winRate).toFixed(0) : item.winRate.toFixed(0)}%</b>
      </div>
    </div>
  )
}

// ========== SHARE MODAL — envoie l'IMAGE ==========
function ShareModal({ stats, user, onClose }) {
  const cardRef = React.useRef(null)
  const [status, setStatus] = useState('idle') // idle | generating | error

  const generateBlob = async () => {
    const el = cardRef.current
    if (!el) throw new Error('no-card')
    // Dynamic import pour ne pas bloquer le premier paint
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    })
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('blob-fail')), 'image/png', 0.95)
    })
  }

  const handleShare = async () => {
    setStatus('generating')
    try {
      const blob = await generateBlob()
      const file = new File([blob], 'insiders-recap.png', { type: 'image/png' })

      // Web Share API v2 — partage de fichier si supporté
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Mes stats Insiders',
          text: `Mon ROI: ${formatPercent(stats.roi)}`,
        })
        setStatus('idle')
        return
      }

      // Fallback : download direct
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'insiders-recap.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus('idle')
    } catch (e) {
      console.error(e)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  const handleDownload = async () => {
    setStatus('generating')
    try {
      const blob = await generateBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `insiders-recap-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus('idle')
    } catch (e) {
      console.error(e)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />
      <div
        className="relative w-full max-w-sm animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Card visuelle à partager — DS app, ink-900 + blue-500 */}
        <div
          ref={cardRef}
          style={{
            background: 'linear-gradient(160deg, #020b20 0%, #061331 60%, #020b20 100%)',
            borderRadius: 24,
            padding: '28px 24px',
            color: '#EFF4FF',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(41,98,255,0.25)',
            border: '1px solid rgba(41,98,255,0.25)',
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          }}
        >
          {/* Halo bleu décoratif */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(41,98,255,0.18), transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, position: 'relative' }}>
            <div style={{
              fontSize: 11, fontWeight: 900, letterSpacing: '0.18em',
              color: '#2962ff',
              fontFamily: '"Archivo Black", sans-serif',
              fontStyle: 'italic',
            }}>INSIDERS</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(239,244,255,0.6)' }}>
              {new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }).toUpperCase()}
            </div>
          </div>

          <div style={{
            fontSize: 24, fontWeight: 900, fontStyle: 'italic',
            lineHeight: 1.1, marginBottom: 24,
            fontFamily: '"Archivo Black", sans-serif',
            color: 'white',
            textTransform: 'uppercase',
            position: 'relative',
          }}>
            {(user.firstName || user.pseudo).toUpperCase()}, VOICI<br/>TA LECTURE.
          </div>

          <div style={{
            background: 'rgba(41,98,255,0.08)',
            border: '1px solid rgba(41,98,255,0.2)',
            borderRadius: 16, padding: 18, marginBottom: 12, position: 'relative',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.15em',
              color: 'rgba(239,244,255,0.55)', marginBottom: 4,
              fontFamily: '"Archivo Black", sans-serif',
            }}>ROI</div>
            <div style={{
              fontSize: 42, fontWeight: 900, fontStyle: 'italic', lineHeight: 1,
              color: stats.roi >= 0 ? '#22c55e' : '#ef4444',
              fontFamily: '"Archivo Black", sans-serif',
            }}>
              {formatPercent(stats.roi)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, position: 'relative' }}>
            <div style={{
              background: 'rgba(41,98,255,0.08)',
              border: '1px solid rgba(41,98,255,0.2)',
              borderRadius: 12, padding: 12,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                color: 'rgba(239,244,255,0.55)',
                fontFamily: '"Archivo Black", sans-serif',
              }}>PROFIT</div>
              <div style={{
                fontSize: 20, fontWeight: 900, marginTop: 2,
                color: stats.profit >= 0 ? '#22c55e' : '#ef4444',
                fontFamily: '"Archivo Black", sans-serif',
              }}>{formatCurrency(stats.profit, user.currency)}</div>
            </div>
            <div style={{
              background: 'rgba(41,98,255,0.08)',
              border: '1px solid rgba(41,98,255,0.2)',
              borderRadius: 12, padding: 12,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                color: 'rgba(239,244,255,0.55)',
                fontFamily: '"Archivo Black", sans-serif',
              }}>% RÉUSSIS</div>
              <div style={{
                fontSize: 20, fontWeight: 900, marginTop: 2,
                color: 'white',
                fontFamily: '"Archivo Black", sans-serif',
              }}>{stats.winRate.toFixed(0)}%</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(41,98,255,0.08)',
            border: '1px solid rgba(41,98,255,0.2)',
            borderRadius: 12, padding: 12, marginBottom: 16, position: 'relative',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
              color: 'rgba(239,244,255,0.55)',
              fontFamily: '"Archivo Black", sans-serif',
            }}>TOTAL PARIS</div>
            <div style={{
              fontSize: 20, fontWeight: 900, marginTop: 2,
              color: 'white',
              fontFamily: '"Archivo Black", sans-serif',
            }}>{stats.count}</div>
          </div>

          {/* Pill INSIDERS bas */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div style={{
              padding: '8px 18px',
              borderRadius: 999,
              background: 'rgba(41,98,255,0.15)',
              border: '1px solid rgba(41,98,255,0.4)',
              fontSize: 11, fontWeight: 900,
              letterSpacing: '0.15em',
              color: '#5b83ff',
              fontFamily: '"Archivo Black", sans-serif',
              fontStyle: 'italic',
            }}>
              INSIDERS
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 space-y-2">
          <button onClick={handleShare} className="btn-primary" disabled={status === 'generating'}>
            <Icon name="share" size={14} color="white" />
            {status === 'generating' ? 'Génération…' : status === 'error' ? 'Erreur, réessaye' : 'Partager l\'image'}
          </button>
          <button onClick={handleDownload} className="btn-ghost w-full" disabled={status === 'generating'}>
            Télécharger PNG
          </button>
          <button onClick={onClose} className="btn-ghost w-full">Fermer</button>
        </div>
      </div>
    </div>
  )
}

// end
