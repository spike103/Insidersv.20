import React, { useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import Avatar, { AVATAR_CATALOG } from '../components/Avatar.jsx'
import { useApp } from '../contexts/AppContext.jsx'

export default function Settings() {
  const {
    user, logout, resetCurrentUser, deleteCurrentUser,
    updateStrategy, updateGoals, setBankroll, setCurrency,
    removeCustomPlayer, removeCustomBetType,
    updatePrivacy, upgradeToPremium, downgradeToFree,
    updateUser,
  } = useApp()
  const [bankroll, setBankrollValue] = useState(String(user?.bankrollStart || 500))
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!user) return null

  // Couleur de fallback (initiales) — déterministe sur le username
  const fallbackColor = (() => {
    const palette = ['#2962ff', '#22c55e', '#f0c85a', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#0ea5e9', '#8b5cf6']
    const username = user.username || ''
    let hash = 0
    for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) >>> 0
    return palette[hash % palette.length]
  })()

  return (
    <>
      <TopBar title="Réglages" showBack />
      <div className="px-5 pt-2 pb-28 space-y-6">
        <section>
          <h2 className="field-label">Profil</h2>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <Avatar
                avatarKey={user.avatarKey}
                initials={(user.firstName || user.username || '?').slice(0,1).toUpperCase() + (user.lastName || '').slice(0,1).toUpperCase()}
                color={fallbackColor}
                size={48}
              />
              <div className="flex-1 min-w-0">
                <div className="h3 truncate">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.pseudo}
                </div>
                <div className="caption">@{user.username || user.pseudo} · Membre depuis le {new Date(user.createdAt).toLocaleDateString('fr-FR')}</div>
                {user.email && <div className="micro text-fg-3 mt-1">{user.email}</div>}
              </div>
              <button onClick={logout} className="btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>
                <Icon name="logout" size={13} />
                Déconnexion
              </button>
            </div>
          </div>
        </section>

        {/* AVATAR */}
        <section>
          <h2 className="field-label">Avatar</h2>
          <div className="card p-4">
            <div className="caption mb-3">Choisis le personnage qui te représente, ou garde tes initiales.</div>
            <div className="grid grid-cols-5 gap-2">
              {/* Option : initiales (avatarKey = null) */}
              <button
                onClick={() => updateUser({ avatarKey: null })}
                style={{
                  padding: 6, borderRadius: 12,
                  background: !user.avatarKey ? 'rgba(41,98,255,0.12)' : 'transparent',
                  border: !user.avatarKey ? '1.5px solid var(--blue-500)' : '1px solid var(--ink-600)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
                aria-label="Initiales"
              >
                <Avatar
                  initials={(user.firstName || user.username || '?').slice(0,1).toUpperCase() + (user.lastName || '').slice(0,1).toUpperCase()}
                  color={fallbackColor}
                  size={52}
                  fontSize={18}
                />
                <span className="micro" style={{ fontSize: 9, color: !user.avatarKey ? 'var(--blue-500)' : 'var(--fg-3)', fontWeight: 700 }}>
                  Initiales
                </span>
              </button>

              {/* Catalogue des 4 personnages */}
              {AVATAR_CATALOG.map(av => {
                const active = user.avatarKey === av.id
                return (
                  <button
                    key={av.id}
                    onClick={() => updateUser({ avatarKey: av.id })}
                    style={{
                      padding: 6, borderRadius: 12,
                      background: active ? 'rgba(41,98,255,0.12)' : 'transparent',
                      border: active ? '1.5px solid var(--blue-500)' : '1px solid var(--ink-600)',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}
                    aria-label={av.name}
                  >
                    <Avatar avatarKey={av.id} size={52} />
                    <span className="micro" style={{ fontSize: 9, color: active ? 'var(--blue-500)' : 'var(--fg-3)', fontWeight: 700 }}>
                      {av.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* PLAN — 3 TIERS */}
        <section>
          <h2 className="field-label">Plan</h2>
          <div className="card p-3 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="micro" style={{ color: 'var(--fg-3)', fontWeight: 800, letterSpacing: '0.12em' }}>PLAN ACTUEL</div>
                <div className="h3 mt-1" style={{ textTransform: 'capitalize' }}>{user.plan || 'free'}</div>
              </div>
              {user.plan === 'premium' && (
                <span style={{
                  fontSize: 10, fontWeight: 900, letterSpacing: '0.12em',
                  color: '#1a0f00', background: 'linear-gradient(135deg, #ffe587, #f0c85a)',
                  padding: '4px 10px', borderRadius: 6,
                }}>PREMIUM</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <PlanCard
              tier="free"
              price="0€"
              tagline="Valider l'app, construire l'habitude"
              features={['Saisie manuelle illimitée', 'Stats de base (P&L, taux réussite)', 'Historique 30 derniers paris', '1 sport (tennis)', 'OCR ticket — 3/mois']}
              current={user.plan === 'free' || !user.plan}
              onSelect={() => downgradeToFree()}
            />
            <PlanCard
              tier="pro"
              price="6,99€"
              tagline="Le betteur sérieux qui veut progresser"
              badge="Plus populaire"
              features={['Tout du Free', 'Historique illimité', 'OCR ticket illimité', 'Résultats tennis auto', 'Tous sports (foot, basket)', 'Stats avancées + heatmaps', 'Détection tilt & biais', 'Rapport IA hebdo']}
              current={user.plan === 'premium'}
              onSelect={upgradeToPremium}
              accent="var(--blue-500)"
            />
            <PlanCard
              tier="sharp"
              price="14,99€"
              tagline="Le betteur qui veut un edge data"
              features={['Tout du Pro', 'Chat IA illimité', 'Stratégie de mise personnalisée', 'Simulation Monte Carlo', 'Closing line value tracker', 'Backtesting de stratégies', 'Export données complet', 'Alertes intelligentes custom']}
              current={false}
              onSelect={() => alert('Plan Sharp disponible Phase 2 (paiement Stripe à venir)')}
              accent="#a855f7"
              comingSoon
            />
          </div>

          <div className="caption mt-3 text-center" style={{ fontSize: 10 }}>
            Tarification de démo — facturation Stripe / RevenueCat à venir
          </div>
        </section>

        {/* CONFIDENTIALITÉ */}
        <section>
          <h2 className="field-label">Confidentialité</h2>
          <div className="card p-4 space-y-4">
            <PrivacyRow
              label="Mes stats"
              hint="Qui peut voir ton ROI, profit, win rate"
              value={user.privacy?.showStats || 'friends'}
              onChange={(v) => updatePrivacy({ showStats: v })}
            />
            <PrivacyRow
              label="Mes paris en cours"
              hint="Qui peut voir tes paris pending"
              value={user.privacy?.showPendingBets || 'friends'}
              onChange={(v) => updatePrivacy({ showPendingBets: v })}
            />
            <div className="flex items-start justify-between gap-3 pt-3" style={{ borderTop: '1px solid var(--ink-600)' }}>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 14, fontWeight: 600 }}>Apparaître au classement</div>
                <div className="caption mt-1">Ton @username sera visible dans le leaderboard mondial</div>
              </div>
              <button
                onClick={() => updatePrivacy({ showInLeaderboard: !user.privacy?.showInLeaderboard })}
                style={{
                  width: 48, height: 28, borderRadius: 14,
                  background: user.privacy?.showInLeaderboard !== false ? 'var(--blue-500)' : 'var(--ink-700)',
                  border: 'none', cursor: 'pointer', position: 'relative',
                  transition: 'background 200ms', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 2,
                  left: user.privacy?.showInLeaderboard !== false ? 22 : 2,
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'white', transition: 'left 200ms',
                }} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="field-label">Bankroll</h2>
          <div className="card p-4 space-y-3">
            <div>
              <label className="micro text-fg-3 block mb-2">Capital de départ ({user.currency})</label>
              <div className="flex gap-2">
                <input type="number" inputMode="decimal" value={bankroll} onChange={(e) => setBankrollValue(e.target.value)} />
                <button onClick={() => setBankroll(Number(bankroll) || 0)} className="btn-primary" style={{ width: 'auto', padding: '12px 16px' }}>
                  <Icon name="check" size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className="micro text-fg-3 block mb-2">Devise</label>
              <select value={user.currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="€">Euro (€)</option>
                <option value="$">Dollar ($)</option>
                <option value="£">Livre (£)</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="field-label">Stratégie de mise</h2>
          <div className="card p-4 space-y-3">
            <div>
              <label className="micro text-fg-3 block mb-2">Type de mise</label>
              <select value={user.strategy.type} onChange={(e) => updateStrategy({ type: e.target.value })}>
                <option value="flat">Mise fixe</option>
                <option value="percent">% de bankroll</option>
                <option value="kelly">Critère de Kelly</option>
              </select>
            </div>
            {user.strategy.type === 'flat' && (
              <div>
                <label className="micro text-fg-3 block mb-2">Mise ({user.currency})</label>
                <input type="number" value={user.strategy.flatAmount} onChange={(e) => updateStrategy({ flatAmount: Number(e.target.value) || 0 })} />
              </div>
            )}
            {user.strategy.type === 'percent' && (
              <div>
                <label className="micro text-fg-3 block mb-2">% de bankroll</label>
                <input type="number" step="0.1" value={user.strategy.percentAmount} onChange={(e) => updateStrategy({ percentAmount: Number(e.target.value) || 0 })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="micro text-fg-3 block mb-2">Cote min</label>
                <input type="number" step="0.1" value={user.strategy.minOdd} onChange={(e) => updateStrategy({ minOdd: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="micro text-fg-3 block mb-2">Cote max</label>
                <input type="number" step="0.1" value={user.strategy.maxOdd} onChange={(e) => updateStrategy({ maxOdd: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="field-label">Objectifs</h2>
          <div className="card p-4 grid grid-cols-2 gap-3">
            <div>
              <label className="micro text-fg-3 block mb-2">Profit mensuel ({user.currency})</label>
              <input type="number" value={user.goals.monthlyProfit} onChange={(e) => updateGoals({ monthlyProfit: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="micro text-fg-3 block mb-2">ROI mensuel (%)</label>
              <input type="number" step="0.5" value={user.goals.monthlyROI} onChange={(e) => updateGoals({ monthlyROI: Number(e.target.value) || 0 })} />
            </div>
          </div>
        </section>

        {user.customPlayers?.length > 0 && (
          <section>
            <h2 className="field-label">Joueurs personnalisés ({user.customPlayers.length})</h2>
            <div className="card p-2 space-y-1">
              {user.customPlayers.map(p => (
                <div key={p.id} className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{p.flag}</span>
                    <span className="text-sm truncate">{p.name}</span>
                    <span className="micro text-fg-3">{p.tour}</span>
                  </div>
                  <button onClick={() => removeCustomPlayer(p.id)} className="w-8 h-8 flex items-center justify-center" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <Icon name="clear" size={16} color="muted" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="field-label">Données</h2>
          <div className="space-y-2">
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)} className="btn-ghost w-full" style={{ color: 'var(--gold-400)', borderColor: 'rgba(240,224,128,0.3)' }}>
                <Icon name="refresh" size={15} /> Réinitialiser mes données
              </button>
            ) : (
              <div className="card p-3 space-y-2" style={{ borderColor: 'rgba(240,224,128,0.4)' }}>
                <p className="caption">Toutes tes données seront effacées.</p>
                <div className="flex gap-2">
                  <button onClick={() => { resetCurrentUser(); setConfirmReset(false) }} className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: 13 }}>Confirmer</button>
                  <button onClick={() => setConfirmReset(false)} className="btn-ghost" style={{ flex: 1, padding: '10px', fontSize: 13 }}>Annuler</button>
                </div>
              </div>
            )}
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="btn-ghost w-full" style={{ color: 'var(--loss-400)', borderColor: 'rgba(239,68,68,0.3)' }}>
                <Icon name="trash" size={15} /> Supprimer mon compte
              </button>
            ) : (
              <div className="card p-3 space-y-2" style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
                <p className="caption">Action irréversible.</p>
                <div className="flex gap-2">
                  <button onClick={deleteCurrentUser} className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: 13, background: 'var(--loss-500)', boxShadow: 'none' }}>Supprimer</button>
                  <button onClick={() => setConfirmDelete(false)} className="btn-ghost" style={{ flex: 1, padding: '10px', fontSize: 13 }}>Annuler</button>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="text-center micro text-fg-4">Insiders v2 · MVP local</div>
      </div>
    </>
  )
}

function PrivacyRow({ label, hint, value, onChange }) {
  const options = [
    { id: 'public', label: 'Tous' },
    { id: 'friends', label: 'Amis' },
    { id: 'private', label: 'Privé' },
  ]
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div className="caption" style={{ marginBottom: 8 }}>{hint}</div>
      <div className="grid grid-cols-3 gap-2">
        {options.map(o => {
          const active = value === o.id
          const stroke = active ? 'var(--blue-500)' : 'var(--fg-2)'
          return (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              style={{
                padding: '10px 4px', borderRadius: 8,
                background: active ? 'rgba(41,98,255,0.12)' : 'var(--ink-700)',
                border: active ? '1.5px solid var(--blue-500)' : '1px solid var(--ink-600)',
                color: active ? 'var(--blue-500)' : 'var(--fg-2)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              }}
            >
              {/* SVG icons : globe / users / lock */}
              {o.id === 'public' && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M 3 12 L 21 12" />
                  <path d="M 12 3 Q 16 12 12 21 Q 8 12 12 3" />
                </svg>
              )}
              {o.id === 'friends' && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M 3 20 Q 3 14 9 14 Q 15 14 15 20" />
                  <circle cx="17" cy="8" r="2.5" />
                  <path d="M 14.5 14 Q 21 14 21 20" />
                </svg>
              )}
              {o.id === 'private' && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M 8 11 V 7 a 4 4 0 0 1 8 0 V 11" />
                </svg>
              )}
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PlanCard({ tier, price, tagline, features, current, onSelect, accent = 'var(--ink-600)', badge, comingSoon }) {
  return (
    <div
      className="card"
      style={{
        padding: 14,
        borderColor: current ? accent : 'var(--ink-600)',
        borderWidth: current ? 1.5 : 1,
        background: current ? `${accent}0d` : 'var(--ink-800)',
        position: 'relative',
      }}
    >
      {badge && (
        <span style={{
          position: 'absolute', top: -8, right: 14,
          padding: '2px 8px', borderRadius: 6,
          background: accent, color: 'white',
          fontSize: 9, fontWeight: 900, letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>{badge}</span>
      )}
      <div className="flex items-baseline justify-between mb-1">
        <div className="h3" style={{ textTransform: 'capitalize', fontSize: 16 }}>{tier}</div>
        <div style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 22, fontWeight: 900, color: current ? accent : 'var(--fg-1)' }}>
          {price}<span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', marginLeft: 4 }}>/mois</span>
        </div>
      </div>
      <div className="caption mb-3" style={{ fontSize: 11 }}>{tagline}</div>
      <ul style={{ fontSize: 11, color: 'var(--fg-2)', listStyle: 'none', padding: 0, margin: 0 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', gap: 6, padding: '2px 0' }}>
            <span style={{ color: accent, flexShrink: 0 }}>•</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {!current && !comingSoon && (
        <button
          onClick={onSelect}
          className="btn-ghost w-full mt-3"
          style={{ fontSize: 12, padding: '8px', borderColor: accent, color: accent }}
        >
          Choisir {tier}
        </button>
      )}
      {comingSoon && (
        <div className="caption text-center mt-3" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
          Disponible bientôt
        </div>
      )}
      {current && (
        <div className="caption text-center mt-3" style={{ fontSize: 10, color: accent, fontWeight: 800 }}>
          PLAN ACTUEL
        </div>
      )}
    </div>
  )
}
