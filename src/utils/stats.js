export const BET_STATUS = {
  PENDING: 'pending',
  WON: 'won',
  LOST: 'lost',
  VOID: 'void',
  CASHOUT: 'cashout',
}

export function betProfit(bet) {
  if (bet.status === BET_STATUS.WON) return +(bet.stake * (bet.odd - 1)).toFixed(2)
  if (bet.status === BET_STATUS.LOST) return -bet.stake
  if (bet.status === BET_STATUS.VOID) return 0
  if (bet.status === BET_STATUS.CASHOUT) return +((bet.cashout || 0) - bet.stake).toFixed(2)
  return 0
}

export function totalProfit(bets) {
  return +bets.reduce((acc, b) => acc + betProfit(b), 0).toFixed(2)
}

export function totalStake(bets) {
  return +bets.filter(b => b.status !== BET_STATUS.PENDING).reduce((acc, b) => acc + b.stake, 0).toFixed(2)
}

export function computeROI(bets) {
  const settled = bets.filter(b => b.status !== BET_STATUS.PENDING)
  const stake = totalStake(settled)
  if (stake === 0) return 0
  return +((totalProfit(settled) / stake) * 100).toFixed(2)
}

export function computeWinRate(bets) {
  const settled = bets.filter(b => [BET_STATUS.WON, BET_STATUS.LOST].includes(b.status))
  if (settled.length === 0) return 0
  const won = settled.filter(b => b.status === BET_STATUS.WON).length
  return +((won / settled.length) * 100).toFixed(1)
}

export function computeStreak(bets) {
  const settled = [...bets].filter(b => [BET_STATUS.WON, BET_STATUS.LOST].includes(b.status))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  if (settled.length === 0) return { type: null, count: 0 }
  const first = settled[0].status
  let count = 0
  for (const b of settled) { if (b.status === first) count++; else break }
  return { type: first, count }
}

export function averageStake(bets) {
  const settled = bets.filter(b => b.status !== BET_STATUS.PENDING)
  if (settled.length === 0) return 0
  return +(settled.reduce((a, b) => a + b.stake, 0) / settled.length).toFixed(2)
}

export function cumulativePnL(bets) {
  const sorted = [...bets].filter(b => b.status !== BET_STATUS.PENDING)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  let running = 0
  return sorted.map(b => {
    running += betProfit(b)
    return { date: b.date, pnl: +running.toFixed(2), id: b.id }
  })
}

export function filterBets(bets, filters = {}) {
  const now = new Date()
  return bets.filter(b => {
    if (filters.timeframe) {
      const d = new Date(b.date)
      const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365, month: 30 }[filters.timeframe]
      if (days && (now - d) / (1000 * 60 * 60 * 24) > days) return false
    }
    if (filters.surface && b.surface !== filters.surface) return false
    if (filters.tour && b.tour !== filters.tour) return false
    if (filters.betType && b.betType !== filters.betType) return false
    if (filters.status && b.status !== filters.status) return false
    if (filters.tournament && b.tournamentId !== filters.tournament) return false
    if (filters.player && !(b.players || []).includes(filters.player)) return false
    if (filters.oddRange) {
      const [min, max] = filters.oddRange
      if (b.odd < min || b.odd > max) return false
    }
    return true
  })
}

// Detect tilt
export function detectTilt(bets) {
  const sorted = [...bets].sort((a, b) => new Date(a.date) - new Date(b.date))
  const episodes = []
  for (let i = 0; i < sorted.length - 2; i++) {
    const b = sorted[i]
    if (b.status !== BET_STATUS.LOST) continue
    const window = []
    for (let j = i + 1; j < sorted.length; j++) {
      const diff = (new Date(sorted[j].date) - new Date(b.date)) / 60000
      if (diff > 60) break
      window.push(sorted[j])
    }
    if (window.length >= 2 && window.some(w => w.stake > b.stake * 1.5)) {
      episodes.push({ trigger: b, follows: window })
    }
  }
  return episodes
}

export function profitBySurface(bets) {
  const surfaces = ['Hard', 'Clay', 'Grass', 'Indoor']
  return surfaces.map(s => {
    const f = bets.filter(b => b.surface === s)
    return { surface: s, profit: totalProfit(f), roi: computeROI(f), count: f.length, winRate: computeWinRate(f) }
  })
}

export function profitByOddRange(bets) {
  const ranges = [
    { label: '1.01–1.50', min: 1.01, max: 1.50 },
    { label: '1.50–2.00', min: 1.50, max: 2.00 },
    { label: '2.00–3.00', min: 2.00, max: 3.00 },
    { label: '3.00+', min: 3.00, max: 999 },
  ]
  return ranges.map(r => {
    const f = bets.filter(b => b.odd >= r.min && b.odd < r.max)
    return { label: r.label, profit: totalProfit(f), roi: computeROI(f), count: f.length, winRate: computeWinRate(f) }
  })
}

export function profitByBetType(bets) {
  const map = {}
  bets.forEach(b => { if (!map[b.betType]) map[b.betType] = []; map[b.betType].push(b) })
  return Object.entries(map).map(([type, list]) => ({
    type, profit: totalProfit(list), roi: computeROI(list), count: list.length, winRate: computeWinRate(list),
  })).sort((a, b) => b.profit - a.profit)
}

export function profitByPlayer(bets) {
  const map = {}
  bets.forEach(b => {
    // Cas combiné : si chaque match a son propre status,
    // on traite chaque match comme un pari virtuel sur le pick concerné
    // (mise unitaire = stake / nb matchs, gain = stake/N × (odd-1) si won)
    if (b.mode === 'combine' && b.matches && b.matches.length > 0) {
      const unitStake = (b.stake || 0) / b.matches.length
      b.matches.forEach(m => {
        if (!m.players || m.players.length === 0) return
        // Identifier le joueur "pick" du match
        let pickedPlayer = null
        if (m.betType === 'ml_p1') pickedPlayer = m.players[0]
        else if (m.betType === 'ml_p2') pickedPlayer = m.players[1]
        else pickedPlayer = m.players[0] // fallback custom

        if (!pickedPlayer) return

        // Construire un "pari virtuel" pour ce joueur à partir du match individuel
        const matchStatus = m.status || b.status || 'pending'
        const virtualBet = {
          stake: unitStake,
          odd: m.odd || 1,
          status: matchStatus,
          players: [pickedPlayer],
        }
        if (!map[pickedPlayer]) map[pickedPlayer] = []
        map[pickedPlayer].push(virtualBet)
      })
      return
    }

    // Cas simple : on attribue le pari à tous les joueurs listés
    ;(b.players || []).forEach(p => {
      if (!map[p]) map[p] = []
      map[p].push(b)
    })
  })
  return Object.entries(map).map(([player, list]) => ({
    player, profit: totalProfit(list), roi: computeROI(list), count: list.length, winRate: computeWinRate(list),
  })).sort((a, b) => b.profit - a.profit)
}

export function profitByTournament(bets) {
  const map = {}
  bets.forEach(b => {
    if (!b.tournamentId) return
    if (!map[b.tournamentId]) map[b.tournamentId] = []
    map[b.tournamentId].push(b)
  })
  return Object.entries(map).map(([tid, list]) => ({
    tournamentId: tid, profit: totalProfit(list), roi: computeROI(list), count: list.length,
  })).sort((a, b) => b.profit - a.profit)
}

export function profitByTour(bets) {
  return ['ATP', 'WTA'].map(t => {
    const f = bets.filter(b => b.tour === t)
    return { tour: t, profit: totalProfit(f), roi: computeROI(f), count: f.length, winRate: computeWinRate(f) }
  })
}

export function maxDrawdown(bets) {
  const pnl = cumulativePnL(bets)
  if (pnl.length === 0) return 0
  let peak = 0, maxDD = 0
  pnl.forEach(p => {
    if (p.pnl > peak) peak = p.pnl
    const dd = peak - p.pnl
    if (dd > maxDD) maxDD = dd
  })
  return +maxDD.toFixed(2)
}

export function profitFactor(bets) {
  const wins = bets.filter(b => b.status === BET_STATUS.WON).reduce((a, b) => a + betProfit(b), 0)
  const losses = Math.abs(bets.filter(b => b.status === BET_STATUS.LOST).reduce((a, b) => a + betProfit(b), 0))
  if (losses === 0) return wins > 0 ? 999 : 0
  return +(wins / losses).toFixed(2)
}

// Find the weakest area (for Customized Insights)
export function findWeakestArea(bets) {
  // check tour, surface, bet type — return the category with worst ROI & significant count
  const results = []
  profitByTour(bets).forEach(r => { if (r.count >= 3 && r.roi < 0) results.push({ kind: 'tour', label: r.tour, ...r }) })
  profitBySurface(bets).forEach(r => { if (r.count >= 3 && r.roi < 0) results.push({ kind: 'surface', label: r.surface, ...r }) })
  profitByBetType(bets).forEach(r => { if (r.count >= 3 && r.roi < 0) results.push({ kind: 'betType', label: r.type, ...r }) })
  return results.sort((a, b) => a.roi - b.roi)
}

export function findStrongestArea(bets) {
  const results = []
  profitByTour(bets).forEach(r => { if (r.count >= 3 && r.roi > 0) results.push({ kind: 'tour', label: r.tour, ...r }) })
  profitBySurface(bets).forEach(r => { if (r.count >= 3 && r.roi > 0) results.push({ kind: 'surface', label: r.surface, ...r }) })
  profitByBetType(bets).forEach(r => { if (r.count >= 3 && r.roi > 0) results.push({ kind: 'betType', label: r.type, ...r }) })
  return results.sort((a, b) => b.roi - a.roi)
}

export function formatCurrency(n, currency = '€') {
  if (n == null || !Number.isFinite(n)) return `— ${currency}`
  const sign = n > 0 ? '+' : ''
  return `${sign}${Math.round(n)} ${currency}`
}

export function formatCurrencyPrecise(n, currency = '€') {
  if (n == null || !Number.isFinite(n)) return `— ${currency}`
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)} ${currency}`
}

export function formatPercent(n, withSign = true) {
  if (n == null || !Number.isFinite(n)) return '—%'
  const sign = withSign && n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}
