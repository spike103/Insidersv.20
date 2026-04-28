import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import AdModal from '../components/AdModal.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { SURFACES } from '../data/players.js'
import { TOURNAMENTS, tournamentsOnDate } from '../data/tournaments.js'

const ROUNDS = [
  { id: 'R128', label: '1er tour (R128)' },
  { id: 'R64', label: '2e tour (R64)' },
  { id: 'R32', label: '3e tour (R32)' },
  { id: 'R16', label: '1/8 (R16)' },
  { id: 'QF', label: 'Quart de finale' },
  { id: 'SF', label: 'Demi-finale' },
  { id: 'F', label: 'Finale' },
  { id: 'Qualif', label: 'Qualifications' },
]

function lastName(full) {
  if (!full) return ''
  const parts = full.trim().split(/\s+/)
  return parts[parts.length - 1]
}

export default function AddBet() {
  const navigate = useNavigate()
  const { addBet, allPlayers, user, checkQuota, grantAdCredit, updateUser } = useApp()
  const [adOpen, setAdOpen] = useState(false)
  const [pendingSubmitData, setPendingSubmitData] = useState(null)

  const [mode, setMode] = useState('simple') // simple | combine | live

  const [matches, setMatches] = useState([
    { sport: 'tennis', player1: '', player2: '', tournamentId: '', round: '', odd: '1.85', pick: 'ml_p1', customBet: '', league: '' },
  ])
  const [focusField, setFocusField] = useState(null)
  const [query, setQuery] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)

  const [surface, setSurface] = useState('Hard')
  const [tour, setTour] = useState('ATP')

  const [stakeMode, setStakeMode] = useState('eur')
  const [stake, setStake] = useState(user?.strategy?.flatAmount ? String(user.strategy.flatAmount) : '10')
  const [stakePct, setStakePct] = useState(user?.strategy?.percentAmount ? String(user.strategy.percentAmount) : '2')
  const [status, setStatus] = useState('pending')

  // ANTI-FRICTION : bookmaker (pré-rempli) + confiance + timer silencieux
  const [bookmaker, setBookmaker] = useState(user?.lastBookmaker || '')
  const [confidence, setConfidence] = useState(null) // null | 'low' | 'mid' | 'high'

  // Timer silencieux : démarre dès l'ouverture du form, capturé en arrière-plan
  const formOpenedAtRef = React.useRef(Date.now())
  // Reset au changement de mode (simple → combine etc.) — pas vraiment besoin mais propre
  useEffect(() => { formOpenedAtRef.current = Date.now() }, [])

  // Scanner OCR — placeholder Phase 2 Supabase
  const [scannerOpen, setScannerOpen] = useState(false)

  const availableTournaments = useMemo(() => tournamentsOnDate(date), [date])

  useEffect(() => {
    if (mode === 'combine' && matches.length < 2) {
      setMatches([...matches, { sport: 'tennis', player1: '', player2: '', tournamentId: '', round: '', odd: '1.85', pick: 'ml_p1', customBet: '', league: '' }])
    }
    if (mode !== 'combine' && matches.length > 1) {
      setMatches([matches[0]])
    }
  }, [mode])

  const updateMatch = (idx, patch) => {
    setMatches(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m))
  }

  const addMatch = () => setMatches([...matches, { sport: 'tennis', player1: '', player2: '', tournamentId: '', round: '', odd: '1.85', pick: 'ml_p1', customBet: '', league: '' }])
  const removeMatch = (idx) => setMatches(matches.filter((_, i) => i !== idx))

  // Auto-fill surface/tour from 1st match tournament
  useEffect(() => {
    const m0 = matches[0]
    if (!m0?.tournamentId) return
    const t = TOURNAMENTS.find(x => x.id === m0.tournamentId)
    if (!t) return
    setSurface(t.surface)
    if (t.tour === 'ATP') setTour('ATP')
    else if (t.tour === 'WTA') setTour('WTA')
  }, [matches[0]?.tournamentId])

  useEffect(() => {
    const name = matches[0]?.player1
    if (!name) return
    const p = allPlayers.find(x => x.name === name)
    if (p && p.tour && p.tour !== 'Mixte') setTour(p.tour)
  }, [matches[0]?.player1])

  const suggestions = useMemo(() => {
    if (!focusField || !query) return []
    const q = query.toLowerCase()
    return allPlayers.filter(p => p.name.toLowerCase().includes(q)).slice(0, 6)
  }, [allPlayers, query, focusField])

  const pickPlayer = (name) => {
    if (!focusField) return
    updateMatch(focusField.matchIdx, { [focusField.field]: name })
    setQuery('')
    setFocusField(null)
  }

  const addCustomPlayer = () => {
    const name = query.trim()
    if (!name || !focusField) return
    updateMatch(focusField.matchIdx, { [focusField.field]: name })
    setQuery('')
    setFocusField(null)
  }

  const combinedOdd = useMemo(() => {
    if (mode !== 'combine') return Number(matches[0]?.odd || 1)
    return matches.reduce((acc, m) => acc * (Number(m.odd) || 1), 1)
  }, [matches, mode])

  const effectiveStake = useMemo(() => {
    if (stakeMode === 'pct') {
      const br = user?.bankrollStart || 500
      return +(br * (Number(stakePct) || 0) / 100).toFixed(2)
    }
    return Number(stake) || 0
  }, [stake, stakePct, stakeMode, user])

  const potentialGain = useMemo(() => {
    return +(effectiveStake * (combinedOdd - 1)).toFixed(2)
  }, [effectiveStake, combinedOdd])

  // Joueur 2 obligatoire
  const canSubmit =
    matches.every(m =>
      m.player1?.trim() &&
      m.player2?.trim() &&
      Number(m.odd) > 1 &&
      (m.pick !== 'custom' || m.customBet?.trim())
    ) &&
    effectiveStake > 0

  const buildBetPayload = () => {
    const buildBetTypeInfo = (m) => {
      if (m.pick === 'ml_p1') return { betType: 'ml_p1', customBetLabel: null }
      if (m.pick === 'ml_p2') return { betType: 'ml_p2', customBetLabel: null }
      return { betType: 'custom', customBetLabel: (m.customBet || '').trim() }
    }

    // Champs anti-friction communs à tous les modes
    const reflectionSeconds = Math.round((Date.now() - formOpenedAtRef.current) / 1000)
    const meta = {
      bookmaker: bookmaker.trim() || null,
      confidence: confidence,
      reflectionSeconds,
    }

    if (mode === 'combine') {
      const allPlayersInCombo = matches.flatMap(m => [m.player1, m.player2].filter(Boolean))
      const firstTennisMatch = matches.find(m => (m.sport || 'tennis') === 'tennis')
      return {
        players: allPlayersInCombo,
        tournamentId: firstTennisMatch?.tournamentId || null,
        surface, tour,
        betType: 'combine',
        stake: effectiveStake,
        stakeMode, stakePct: stakeMode === 'pct' ? Number(stakePct) : null,
        odd: combinedOdd,
        date: new Date(date + 'T12:00:00').toISOString(),
        status,
        mode: 'combine',
        ...meta,
        matches: matches.map(m => ({
          sport: m.sport || 'tennis',
          players: [m.player1, m.player2].filter(Boolean),
          tournamentId: m.tournamentId || null,
          league: m.league || null,
          round: m.round || null,
          odd: Number(m.odd),
          status: 'pending',
          ...buildBetTypeInfo(m),
        })),
      }
    }

    const m = matches[0]
    const info = buildBetTypeInfo(m)
    return {
      sport: 'tennis',
      players: [m.player1, m.player2].filter(Boolean),
      tournamentId: m.tournamentId || null,
      round: m.round || null,
      surface, tour,
      betType: mode === 'live' ? 'live' : info.betType,
      customBetLabel: info.customBetLabel,
      stake: effectiveStake,
      stakeMode, stakePct: stakeMode === 'pct' ? Number(stakePct) : null,
      odd: Number(m.odd),
      date: new Date(date + 'T12:00:00').toISOString(),
      status,
      mode,
      ...meta,
    }
  }

  const finalizeSubmit = (payload) => {
    addBet(payload)
    // Persiste le dernier bookmaker pour pré-remplir au prochain pari
    if (bookmaker.trim() && bookmaker.trim() !== user?.lastBookmaker) {
      updateUser({ lastBookmaker: bookmaker.trim() })
    }
    navigate('/')
  }

  const submit = () => {
    if (!canSubmit) return
    const payload = buildBetPayload()

    // Vérifier quota
    const quota = checkQuota('addBet')
    if (!quota.allowed) {
      setPendingSubmitData(payload)
      setAdOpen(true)
      return
    }
    finalizeSubmit(payload)
  }

  const handleAdReward = () => {
    grantAdCredit('addBet')
    if (pendingSubmitData) {
      finalizeSubmit(pendingSubmitData)
      setPendingSubmitData(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Ajouter un pari" showBack />

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-2" style={{ paddingBottom: 120 }}>
        {/* Quota indicator pour les users free */}
        {user?.plan !== 'premium' && (() => {
          const q = checkQuota('addBet')
          const used = q.used || 0
          const limit = q.limit || q.max || 10
          const remaining = Math.max(0, limit - used)
          const ratio = limit > 0 ? used / limit : 0
          return (
            <div className="card mb-4" style={{ padding: 12 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="micro" style={{ fontWeight: 700, letterSpacing: '0.08em', color: 'var(--fg-2)' }}>
                  PARIS DU MOIS · {used}/{limit}
                </span>
                {q.credits > 0 && (
                  <span className="micro" style={{ fontWeight: 700, color: 'var(--blue-500)' }}>
                    +{q.credits} via pubs
                  </span>
                )}
              </div>
              <div style={{ height: 4, background: 'var(--ink-700)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, ratio * 100)}%`,
                  background: ratio >= 1 ? 'var(--loss-500)' : ratio >= 0.8 ? 'var(--gold-400)' : 'var(--blue-500)',
                  transition: 'width 300ms',
                }} />
              </div>
              {!q.allowed && (
                <div className="caption mt-2" style={{ color: 'var(--gold-400)' }}>
                  Quota atteint. Regarde une pub pour ajouter ce pari.
                </div>
              )}
            </div>
          )
        })()}

        {/* SCANNER OCR — placeholder Phase 2 */}
        <button
          onClick={() => setScannerOpen(true)}
          className="card w-full mb-4 text-left"
          style={{
            padding: 14,
            background: 'linear-gradient(135deg, rgba(41,98,255,0.12), rgba(41,98,255,0.03))',
            borderColor: 'rgba(41,98,255,0.4)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(41,98,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--blue-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 3 7 h 4 l 2 -3 h 6 l 2 3 h 4 v 13 h -18 z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--blue-500)' }}>
              Scanner mon ticket
            </div>
            <div className="caption" style={{ fontSize: 11, marginTop: 2 }}>
              Photo Winamax/Betclic/Unibet → tout pré-rempli automatiquement
            </div>
          </div>
          <Icon name="chevron_right" size={18} color="muted" />
        </button>

        <div className="segmented mb-5">
          {[
            { id: 'simple', label: 'Simple' },
            { id: 'combine', label: 'Combiné' },
            { id: 'live', label: 'Live' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`seg-btn ${mode === m.id ? 'active' : ''}`}
              style={mode === m.id && m.id === 'live' ? { background: 'var(--loss-500)' } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Date — pleine largeur forcée */}
        <section className="mb-5">
          <label className="field-label">Date du match</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '100%', display: 'block', boxSizing: 'border-box', maxWidth: '100%' }}
          />
        </section>

        {matches.map((match, idx) => (
          <MatchBlock
            key={idx}
            idx={idx}
            match={match}
            mode={mode}
            showRemove={mode === 'combine' && matches.length > 2}
            availableTournaments={availableTournaments}
            onUpdate={(patch) => updateMatch(idx, patch)}
            onRemove={() => removeMatch(idx)}
            focusField={focusField}
            setFocusField={setFocusField}
            query={query}
            setQuery={setQuery}
            suggestions={suggestions}
            pickPlayer={pickPlayer}
            addCustomPlayer={addCustomPlayer}
          />
        ))}

        {mode === 'combine' && (
          <button onClick={addMatch} className="btn-ghost w-full mb-5">
            <Icon name="add" size={16} color="white" />
            Ajouter un match au combiné
          </button>
        )}

        {/* Circuit + Surface */}
        <section className="mb-5 grid grid-cols-2 gap-2">
          <div>
            <label className="field-label">Circuit</label>
            <select value={tour} onChange={(e) => setTour(e.target.value)}>
              <option value="ATP">ATP</option>
              <option value="WTA">WTA</option>
            </select>
          </div>
          <div>
            <label className="field-label">Surface</label>
            <select value={surface} onChange={(e) => setSurface(e.target.value)}>
              {SURFACES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </section>

        {/* Mise & cote */}
        <section className="mb-5">
          <div className="segmented mb-3" style={{ fontSize: 12 }}>
            <button onClick={() => setStakeMode('eur')} className={`seg-btn ${stakeMode === 'eur' ? 'active' : ''}`} style={{ padding: '10px' }}>€</button>
            <button onClick={() => setStakeMode('pct')} className={`seg-btn ${stakeMode === 'pct' ? 'active' : ''}`} style={{ padding: '10px' }}>%</button>
          </div>
          <label className="field-label">
            {stakeMode === 'eur' ? `Mise (${user?.currency || '€'})` : 'Mise (% de bankroll)'}
          </label>
          {stakeMode === 'eur' ? (
            <input type="number" inputMode="decimal" placeholder="10" value={stake} onChange={(e) => setStake(e.target.value)} />
          ) : (
            <input type="number" inputMode="decimal" step="0.1" placeholder="2" value={stakePct} onChange={(e) => setStakePct(e.target.value)} />
          )}
          {stakeMode === 'pct' && (
            <div className="caption mt-2">Mise effective : <b>{effectiveStake.toFixed(2)} {user?.currency || '€'}</b></div>
          )}
          {mode === 'combine' && (
            <div className="caption mt-2">Cote combinée : <b style={{ color: 'var(--blue-500)' }}>{combinedOdd.toFixed(2)}</b></div>
          )}
        </section>

        <section className="mb-5">
          <label className="field-label">Statut</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">En cours</option>
            <option value="won">Gagné</option>
            <option value="lost">Perdu</option>
            <option value="void">Remboursé</option>
          </select>
        </section>

        <section className="mb-5">
          <label className="field-label">
            Bookmaker {user?.lastBookmaker && bookmaker === user.lastBookmaker && (
              <span style={{ color: 'var(--fg-3)', fontWeight: 500 }}>· pré-rempli</span>
            )}
          </label>
          <input
            type="text"
            placeholder="Winamax, Betclic, Unibet…"
            value={bookmaker}
            onChange={(e) => setBookmaker(e.target.value)}
            list="bookmaker-suggestions"
          />
          <datalist id="bookmaker-suggestions">
            <option value="Winamax" />
            <option value="Betclic" />
            <option value="Unibet" />
            <option value="ParionsSport" />
            <option value="PMU" />
            <option value="Bwin" />
            <option value="Stake" />
          </datalist>
        </section>

        <section className="mb-5">
          <label className="field-label">Confiance dans ce pari</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'low', label: 'Flou', bars: 1, color: '#94a3b8' },
              { id: 'mid', label: 'Solide', bars: 2, color: '#5b83ff' },
              { id: 'high', label: 'Très confiant', bars: 3, color: '#22c55e' },
            ].map(opt => {
              const active = confidence === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setConfidence(active ? null : opt.id)}
                  style={{
                    padding: '12px 4px',
                    borderRadius: 12,
                    background: active ? `${opt.color}22` : 'var(--ink-700)',
                    border: active ? `1.5px solid ${opt.color}` : '1px solid var(--ink-600)',
                    color: active ? opt.color : 'var(--fg-2)',
                    fontSize: 11, fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all 150ms',
                  }}
                >
                  {/* SVG signal bars */}
                  <svg viewBox="0 0 24 16" width="26" height="18">
                    <rect x="1" y="11" width="6" height="4" rx="1"
                      fill={opt.bars >= 1 ? opt.color : 'var(--ink-600)'} />
                    <rect x="9" y="6" width="6" height="9" rx="1"
                      fill={opt.bars >= 2 ? opt.color : 'var(--ink-600)'} />
                    <rect x="17" y="1" width="6" height="14" rx="1"
                      fill={opt.bars >= 3 ? opt.color : 'var(--ink-600)'} />
                  </svg>
                  {opt.label}
                </button>
              )
            })}
          </div>
          <div className="caption mt-2" style={{ fontSize: 11 }}>
            Ce niveau sera comparé au résultat réel pour détecter ton overconfidence.
          </div>
        </section>

        {canSubmit && (
          <div className="card p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.02))', borderColor: 'rgba(34,197,94,0.3)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="field-label" style={{ marginBottom: 2 }}>Gain potentiel</div>
                <div className="stat-value text-win" style={{ fontSize: 24 }}>+{potentialGain.toFixed(2)} {user?.currency || '€'}</div>
              </div>
              <div className="text-right caption">
                <div>Mise : {effectiveStake.toFixed(2)} {user?.currency || '€'}</div>
                <div>Cote : {combinedOdd.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className="fixed left-0 right-0 px-5 py-3 safe-bottom"
        style={{ bottom: 0, background: 'var(--ink-900)', borderTop: '1px solid var(--ink-600)', zIndex: 50 }}
      >
        <button onClick={submit} disabled={!canSubmit} className="btn-primary">
          Enregistrer le pari
        </button>
      </div>

      <AdModal
        open={adOpen}
        action="addBet"
        label="Ajouter ce pari"
        onClose={() => { setAdOpen(false); setPendingSubmitData(null) }}
        onReward={handleAdReward}
      />

      {/* SCANNER OCR — Modal placeholder Phase 2 */}
      {scannerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setScannerOpen(false)}
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="card relative w-full max-w-sm animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 22, textAlign: 'center' }}
          >
            <div style={{
              width: 72, height: 72, margin: '0 auto 14px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(41,98,255,0.2), rgba(41,98,255,0.05))',
              border: '1px solid rgba(41,98,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="var(--blue-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 3 7 h 4 l 2 -3 h 6 l 2 3 h 4 v 13 h -18 z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>

            <h3 className="h3 mb-2">Scanner ton ticket</h3>
            <p className="body" style={{ fontSize: 13, marginBottom: 16 }}>
              Cette fonctionnalité arrive bientôt. Bientôt tu pourras prendre une photo de ton coupon Winamax, Betclic ou Unibet, et notre IA extraira automatiquement les joueurs, la cote, la mise et le type de pari.
            </p>

            <div style={{
              padding: 12,
              background: 'rgba(240,200,90,0.08)',
              border: '1px solid rgba(240,200,90,0.3)',
              borderRadius: 10,
              marginBottom: 16,
              textAlign: 'left',
            }}>
              <div className="micro" style={{ color: 'var(--gold-400)', fontWeight: 800, letterSpacing: '0.1em', marginBottom: 4 }}>
                À VENIR · PHASE 2
              </div>
              <div className="caption" style={{ fontSize: 12, color: 'var(--fg-2)' }}>
                OCR via Claude Vision · Résultats automatiques via API tennis · Push notifications de fin de match
              </div>
            </div>

            <button onClick={() => setScannerOpen(false)} className="btn-primary">
              Saisir manuellement pour l'instant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MatchBlock({ idx, match, mode, showRemove, availableTournaments, onUpdate, onRemove, focusField, setFocusField, query, setQuery, suggestions, pickPlayer, addCustomPlayer }) {
  const isFocused = (field) => focusField?.matchIdx === idx && focusField?.field === field
  const p1Last = lastName(match.player1)
  const p2Last = lastName(match.player2)
  const sport = match.sport || 'tennis'
  const isTennis = sport === 'tennis'

  // Labels adaptés par sport
  const playerLabel = isTennis
    ? { p1: 'Joueur 1', p2: 'Joueur 2 (requis)' }
    : sport === 'football'
      ? { p1: 'Équipe 1 (ex: PSG)', p2: 'Équipe 2 (ex: Real)' }
      : { p1: 'Équipe 1 (ex: Lakers)', p2: 'Équipe 2 (ex: Celtics)' }

  return (
    <section className="card mb-4" style={{ padding: 14 }}>
      {mode === 'combine' && (
        <div className="flex items-center justify-between mb-3">
          <span className="field-label" style={{ marginBottom: 0, color: 'var(--blue-500)' }}>Match {idx + 1}</span>
          {showRemove && (
            <button onClick={onRemove} className="w-7 h-7 flex items-center justify-center" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <Icon name="clear" size={16} color="muted" />
            </button>
          )}
        </div>
      )}

      {/* Sport selector — visible UNIQUEMENT en combiné */}
      {mode === 'combine' && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { id: 'tennis', label: 'Tennis' },
            { id: 'football', label: 'Foot' },
            { id: 'basket', label: 'Basket' },
          ].map(s => {
            const active = sport === s.id
            const stroke = active ? 'var(--blue-500)' : 'var(--fg-2)'
            return (
              <button
                key={s.id}
                onClick={() => onUpdate({ sport: s.id, tournamentId: '', round: '' })}
                style={{
                  padding: '10px 6px',
                  borderRadius: 10,
                  background: active ? 'rgba(41,98,255,0.12)' : 'var(--ink-700)',
                  border: active ? '1.5px solid var(--blue-500)' : '1px solid var(--ink-600)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  color: active ? 'var(--blue-500)' : 'var(--fg-1)',
                  fontSize: 12, fontWeight: 700,
                }}
              >
                {/* SVG sport icons — sobres, ligne uniquement */}
                {s.id === 'tennis' && (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={stroke} strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M 3.5 8 Q 12 14 20.5 8" strokeLinecap="round" />
                    <path d="M 3.5 16 Q 12 10 20.5 16" strokeLinecap="round" />
                  </svg>
                )}
                {s.id === 'football' && (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={stroke} strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M 12 5 L 16 8 L 14 13 L 10 13 L 8 8 Z" strokeLinejoin="round" />
                    <path d="M 12 5 L 12 3 M 16 8 L 18.5 7 M 14 13 L 16 17 M 10 13 L 8 17 M 8 8 L 5.5 7" strokeLinecap="round" />
                  </svg>
                )}
                {s.id === 'basket' && (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={stroke} strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M 3 12 L 21 12 M 12 3 L 12 21 M 5.5 5.5 Q 12 12 18.5 18.5 M 18.5 5.5 Q 12 12 5.5 18.5" strokeLinecap="round" />
                  </svg>
                )}
                {s.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder={playerLabel.p1}
            value={isTennis ? (isFocused('player1') ? query : match.player1) : match.player1}
            onFocus={() => {
              if (isTennis) {
                setFocusField({ matchIdx: idx, field: 'player1' })
                setQuery(match.player1)
              }
            }}
            onBlur={() => isTennis && setTimeout(() => setFocusField(null), 200)}
            onChange={(e) => isTennis ? setQuery(e.target.value) : onUpdate({ player1: e.target.value })}
          />
          {isTennis && isFocused('player1') && query && (
            <SuggestionList suggestions={suggestions} query={query} onPick={pickPlayer} onAddCustom={addCustomPlayer} />
          )}
        </div>
        <div className="text-center micro text-fg-3" style={{ fontStyle: 'italic', fontWeight: 700, padding: '2px 0' }}>vs</div>
        <div className="relative">
          <input
            type="text"
            placeholder={playerLabel.p2}
            value={isTennis ? (isFocused('player2') ? query : match.player2) : match.player2}
            onFocus={() => {
              if (isTennis) {
                setFocusField({ matchIdx: idx, field: 'player2' })
                setQuery(match.player2)
              }
            }}
            onBlur={() => isTennis && setTimeout(() => setFocusField(null), 200)}
            onChange={(e) => isTennis ? setQuery(e.target.value) : onUpdate({ player2: e.target.value })}
          />
          {isTennis && isFocused('player2') && query && (
            <SuggestionList suggestions={suggestions} query={query} onPick={pickPlayer} onAddCustom={addCustomPlayer} />
          )}
        </div>
      </div>

      {/* Tennis : tournoi + tour. Foot/Basket : ligue + journée libre */}
      {isTennis ? (
        <>
          <div className="mt-3">
            <label className="field-label">
              Tournoi {availableTournaments.length > 0 ? `· ${availableTournaments.length} actif${availableTournaments.length > 1 ? 's' : ''}` : '· aucun à cette date'}
            </label>
            <select value={match.tournamentId} onChange={(e) => onUpdate({ tournamentId: e.target.value })}>
              <option value="">Sélectionner un tournoi</option>
              {availableTournaments.length === 0 && (
                <optgroup label="Tous les tournois">
                  {TOURNAMENTS.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.category}</option>
                  ))}
                </optgroup>
              )}
              {availableTournaments.length > 0 && availableTournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {t.category}</option>
              ))}
            </select>
            {match.tournamentId && (
              <div className="caption mt-1">
                {(() => {
                  const t = TOURNAMENTS.find(x => x.id === match.tournamentId)
                  return t ? `${t.category} · ${t.surface} · ${t.dates}` : ''
                })()}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-3">
          <label className="field-label">Compétition / Journée</label>
          <input
            type="text"
            placeholder={sport === 'football' ? 'Ligue 1 · J28' : 'NBA Regular Season'}
            value={match.league || ''}
            onChange={(e) => onUpdate({ league: e.target.value })}
          />
        </div>
      )}

      {isTennis && (
        <div className="mt-3">
          <label className="field-label">Tour du tournoi</label>
          <select value={match.round} onChange={(e) => onUpdate({ round: e.target.value })}>
            <option value="">—</option>
            {ROUNDS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
      )}

      {/* PICK simplifié : ML P1 / ML P2 / Personnaliser */}
      <div className="mt-3">
        <label className="field-label">Sur qui tu paries ?</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() => onUpdate({ pick: 'ml_p1' })}
            className="card"
            style={{
              padding: '12px 10px', textAlign: 'center', cursor: 'pointer',
              borderColor: match.pick === 'ml_p1' ? 'var(--blue-500)' : 'var(--ink-600)',
              borderWidth: match.pick === 'ml_p1' ? 1.5 : 1,
              boxShadow: match.pick === 'ml_p1' ? 'var(--glow-blue-soft)' : 'none',
              background: match.pick === 'ml_p1' ? 'rgba(41,98,255,0.08)' : 'transparent',
            }}
          >
            <div className="micro text-fg-3" style={{ letterSpacing: '0.08em', fontWeight: 700 }}>ML</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: match.pick === 'ml_p1' ? 'var(--blue-500)' : 'var(--fg-1)' }}>
              {p1Last || 'Joueur 1'}
            </div>
          </button>
          <button
            onClick={() => onUpdate({ pick: 'ml_p2' })}
            className="card"
            style={{
              padding: '12px 10px', textAlign: 'center', cursor: 'pointer',
              borderColor: match.pick === 'ml_p2' ? 'var(--blue-500)' : 'var(--ink-600)',
              borderWidth: match.pick === 'ml_p2' ? 1.5 : 1,
              boxShadow: match.pick === 'ml_p2' ? 'var(--glow-blue-soft)' : 'none',
              background: match.pick === 'ml_p2' ? 'rgba(41,98,255,0.08)' : 'transparent',
            }}
          >
            <div className="micro text-fg-3" style={{ letterSpacing: '0.08em', fontWeight: 700 }}>ML</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: match.pick === 'ml_p2' ? 'var(--blue-500)' : 'var(--fg-1)' }}>
              {p2Last || 'Joueur 2'}
            </div>
          </button>
        </div>
        <button
          onClick={() => onUpdate({ pick: 'custom' })}
          className="btn-ghost w-full"
          style={{
            borderColor: match.pick === 'custom' ? 'var(--blue-500)' : 'var(--ink-600)',
            color: match.pick === 'custom' ? 'var(--blue-500)' : 'var(--fg-1)',
            fontSize: 12, padding: '10px', fontWeight: 600,
          }}
        >
          {match.pick === 'custom' ? '✓ Pari personnalisé' : '+ Personnaliser (set, jeux, handicap…)'}
        </button>
        {match.pick === 'custom' && (
          <input
            type="text"
            placeholder="Ex: Alcaraz gagne 2-0, Total jeux > 22.5…"
            value={match.customBet}
            onChange={(e) => onUpdate({ customBet: e.target.value })}
            className="mt-2"
            style={{ fontSize: 13 }}
          />
        )}
      </div>

      <div className="mt-3">
        <label className="field-label">Cote</label>
        <input
          type="number" inputMode="decimal" step="0.01"
          placeholder="1.85" value={match.odd}
          onChange={(e) => onUpdate({ odd: e.target.value })}
        />
      </div>
    </section>
  )
}

function SuggestionList({ suggestions, query, onPick, onAddCustom }) {
  return (
    <div
      className="absolute top-full left-0 right-0 z-20 mt-1 card overflow-hidden"
      style={{ maxHeight: 256, overflowY: 'auto' }}
    >
      {suggestions.map(s => (
        <button
          key={s.id}
          onMouseDown={(e) => { e.preventDefault(); onPick(s.name) }}
          className="w-full flex items-center gap-2 p-3 text-left"
          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--ink-600)', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 18 }}>{s.flag || '🌍'}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{s.name}</div>
            <div className="micro text-fg-3">{s.tour}{s.rank ? ` · #${s.rank}` : ''}{s.custom ? ' · perso' : ''}</div>
          </div>
        </button>
      ))}
      {!suggestions.some(s => s.name.toLowerCase() === query.toLowerCase()) && query.trim() && (
        <button
          onMouseDown={(e) => { e.preventDefault(); onAddCustom() }}
          className="w-full flex items-center gap-2 p-3 text-left"
          style={{ background: 'rgba(41,98,255,0.08)', border: 'none', cursor: 'pointer' }}
        >
          <Icon name="add" size={18} color="blue" />
          <span className="text-sm font-semibold" style={{ color: 'var(--blue-500)' }}>Ajouter « {query} » comme nouveau joueur</span>
        </button>
      )}
    </div>
  )
}
