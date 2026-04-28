import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useAuthContext } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { PLAYERS } from '../data/players.js'
import { computeROI, totalProfit, computeWinRate } from '../utils/stats.js'

const AppContext = createContext(null)

const DEFAULT_STRATEGY = { type: 'flat', flatAmount: 10, percentAmount: 2 }
const DEFAULT_GOALS = { monthlyTarget: 100, dailyMax: 50 }

export function AppProvider({ children }) {
  const auth = useAuthContext()
  const { profile, bets, isAuth, isLoading, error: authError } = auth

  // L'objet `user` exposé par AppContext est dérivé du profile + bets cloud
  // pour préserver la compatibilité avec le code existant qui fait `user.bets`, `user.firstName`, etc.
  const user = useMemo(() => {
    if (!profile) return null
    return {
      ...profile,
      bets, // bets viennent de la table séparée Supabase
    }
  }, [profile, bets])

  // ============ COINS = solde de crédits du user (DB) ============
  // Auparavant c'était calculé côté client (compteur de wins).
  // Maintenant c'est le vrai solde stocké dans profiles.credits côté Supabase.
  const coins = useMemo(() => user?.credits || 0, [user?.credits])

  // ============ NOTIFICATIONS / INSIGHTS — calcul local ============
  const notifications = useMemo(() => {
    if (!user || !user.bets) return []
    const list = []
    const settled = user.bets.filter(b => b.status === 'won' || b.status === 'lost')
    const ignored = user.alertsIgnored || []

    const push = (n) => { if (!ignored.includes(n.id)) list.push(n) }

    // 1. Live ROI alerte
    const liveBets = user.bets.filter(b => b.mode === 'live' || b.betType === 'live')
    if (liveBets.length >= 3) {
      const liveSettled = liveBets.filter(b => b.status === 'won' || b.status === 'lost')
      const liveStakeSum = liveSettled.reduce((a, b) => a + b.stake, 0)
      if (liveSettled.length >= 3 && liveStakeSum > 0) {
        const liveROI = computeROI(liveSettled)
        if (liveROI < -10) {
          push({
            id: 'alert_live_negative',
            kind: 'warning',
            title: 'Tes paris LIVE sont en perte',
            body: `ROI live : ${liveROI.toFixed(1)}%. Pause recommandée sur les paris en direct.`,
          })
        }
      }
    }

    // 2. Hot streak aujourd'hui
    const today = new Date().toDateString()
    const wonToday = user.bets.filter(b => b.status === 'won' && new Date(b.date).toDateString() === today).length
    if (wonToday >= 3) {
      push({
        id: 'alert_hot_streak',
        kind: 'success',
        title: `Série gagnante — ${wonToday} paris gagnés aujourd'hui`,
        body: 'Profite de ta forme, mais reste discipliné.',
      })
    }

    // 3. Bad streak
    const last5 = settled.slice(-5)
    if (last5.length === 5 && last5.every(b => b.status === 'lost')) {
      push({
        id: 'alert_bad_streak',
        kind: 'warning',
        title: '5 pertes consécutives',
        body: "Pause recommandée. Le tilt est ton pire ennemi.",
      })
    }

    // 4. Best surface
    if (settled.length >= 10) {
      const bySurface = {}
      settled.forEach(b => {
        if (!b.surface) return
        if (!bySurface[b.surface]) bySurface[b.surface] = []
        bySurface[b.surface].push(b)
      })
      const surfaces = Object.entries(bySurface).filter(([_, l]) => l.length >= 3)
      if (surfaces.length >= 2) {
        const withROI = surfaces.map(([s, l]) => ({ surface: s, roi: computeROI(l), count: l.length }))
        const best = withROI.sort((a, b) => b.roi - a.roi)[0]
        if (best.roi > 15) {
          push({
            id: 'alert_best_surface',
            kind: 'info',
            title: `Tu cartonnes sur ${best.surface}`,
            body: `+${best.roi.toFixed(1)}% ROI sur ${best.count} paris. Concentre-toi là.`,
          })
        }
      }
    }

    // 5. Stake variance
    if (user.bets.length >= 5) {
      const stakes = user.bets.map(b => b.stake).filter(s => s > 0)
      if (stakes.length >= 5) {
        const avgStake = stakes.reduce((a, b) => a + b, 0) / stakes.length
        const variance = stakes.reduce((a, b) => a + Math.pow(b - avgStake, 2), 0) / stakes.length
        const stdev = Math.sqrt(variance)
        if (avgStake > 0 && stdev / avgStake > 0.6) {
          push({
            id: 'alert_stake_variance',
            kind: 'warning',
            title: 'Tes mises sont très irrégulières',
            body: `Tu varies tes mises de ±${stdev.toFixed(0)}${user.currency || '€'}. Une mise constante protège mieux la bankroll.`,
          })
        }
      }
    }

    // 6. Résultats arrivés récemment (< 24h)
    // Ces insights ne sont PAS ignorables (id unique par bet) — ils disparaissent d'eux-mêmes
    // après 24h ou au prochain refresh. C'est un feed temps réel.
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const recent = user.bets.filter(b => {
      if (b.status !== 'won' && b.status !== 'lost') return false
      // On considère "settled récemment" si createdAt < 7j (le bet existe) mais date du match > maintenant - 24h
      const matchTime = new Date(b.date).getTime()
      return (now - matchTime) < dayMs
    }).slice(0, 3) // max 3 résultats récents

    for (const b of recent) {
      const players = b.players || []
      const matchLabel = players.length >= 2 ? `${players[0]} vs ${players[1]}` : 'Ton pari'
      const profit = b.status === 'won' ? b.stake * (b.odd - 1) : -b.stake
      const profitStr = (profit >= 0 ? '+' : '') + profit.toFixed(2) + (user.currency || '€')
      list.push({
        id: `result_${b.id}`,
        kind: b.status === 'won' ? 'success' : 'warning',
        title: b.status === 'won' ? `${matchLabel} — gagné !` : `${matchLabel} — perdu`,
        body: `Pari réglé automatiquement · ${profitStr}`,
      })
    }

    return list
  }, [user])

  // ============ ALL PLAYERS = officiels + custom ============
  const allPlayers = useMemo(() => {
    return [...PLAYERS, ...((user?.customPlayers) || [])]
  }, [user?.customPlayers])

  const findPlayer = useCallback((name) => {
    if (!name) return null
    const clean = name.trim().toLowerCase()
    return allPlayers.find(p => p.name.toLowerCase() === clean) || null
  }, [allPlayers])

  const ensurePlayer = (name, meta = {}) => {
    if (!user || !name?.trim()) return
    const clean = name.trim()
    if (PLAYERS.some(p => p.name.toLowerCase() === clean.toLowerCase())) return
    if ((user.customPlayers || []).some(p => p.name.toLowerCase() === clean.toLowerCase())) return
    const id = `custom_p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newPlayer = {
      id, name: clean,
      tour: meta.tour || 'ATP',
      country: meta.country || 'INT',
      flag: meta.flag || '🌍',
      rank: null,
      bestSurface: meta.surface || 'Hard',
      custom: true,
    }
    auth.updateProfile({ customPlayers: [...(user.customPlayers || []), newPlayer] })
  }

  const addCustomPlayer = (data) => {
    if (!user) return null
    const id = `custom_p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newPlayer = {
      id,
      name: data.name.trim(),
      tour: data.tour || 'ATP',
      country: data.country || 'INT',
      flag: data.flag || '🌍',
      rank: data.rank ? Number(data.rank) : null,
      bestSurface: data.bestSurface || 'Hard',
      hand: data.hand || 'R',
      custom: true,
    }
    auth.updateProfile({ customPlayers: [...(user.customPlayers || []), newPlayer] })
    return newPlayer
  }

  const updateCustomPlayer = (id, patch) => {
    if (!user) return
    auth.updateProfile({
      customPlayers: (user.customPlayers || []).map(p => p.id === id ? { ...p, ...patch } : p),
    })
  }

  const removeCustomPlayer = (id) => {
    if (!user) return
    auth.updateProfile({ customPlayers: (user.customPlayers || []).filter(p => p.id !== id) })
  }

  // ============ CUSTOM BET TYPES (back-compat) ============
  const allBetTypes = useMemo(() => {
    return [...((user?.customBetTypes) || [])]
  }, [user?.customBetTypes])

  const addCustomBetType = (label, icon = '✏️') => {
    if (!user) return
    const id = `custom_${Date.now()}`
    auth.updateProfile({
      customBetTypes: [...(user.customBetTypes || []), { id, label, icon, custom: true }],
    })
  }

  const removeCustomBetType = (id) => {
    if (!user) return
    auth.updateProfile({
      customBetTypes: (user.customBetTypes || []).filter(t => t.id !== id),
    })
  }

  // ============ HELPERS UPDATEUSER (compat) ============
  const updateUser = (patch) => auth.updateProfile(patch)

  const setBankroll = (amount) => auth.updateProfile({ bankrollStart: amount, bankrollCurrent: amount })
  const setCurrency = (currency) => auth.updateProfile({ currency })
  const setOnboardingDone = () => auth.updateProfile({ onboardingDone: true })
  const updateStrategy = (strategy) => auth.updateProfile({ strategy })
  const updateGoals = (goals) => auth.updateProfile({ goals })
  const ignoreAlert = (id) => auth.updateProfile({ alertsIgnored: [...(user.alertsIgnored || []), id] })

  const updatePrivacy = (patch) => {
    if (!user) return
    auth.updateProfile({ privacy: { ...user.privacy, ...patch } })
  }

  // ============ AUTH OPERATIONS ============
  const login = async (emailOrUsername, password) => {
    // Pour back-compat avec ancien Login (qui prend juste un username) :
    // si pas de password fourni, on utilise magic link
    if (!password) {
      // C'est probablement un username. Mais Supabase login = email.
      // Donc on retourne une erreur pour forcer le user à utiliser le nouveau form
      return { ok: false, error: 'Connexion par email requis. Utilise le nouveau formulaire.' }
    }
    return await auth.login(emailOrUsername, password)
  }

  const logout = async () => {
    await auth.logout()
  }

  const resetCurrentUser = async () => {
    if (!user) return
    // Suppression de TOUS les bets de l'user
    await supabase.from('bets').delete().eq('user_id', user.id)
    auth.refresh()
  }

  const deleteCurrentUser = async () => {
    // Note : la suppression complète d'un user (auth.users) demande un appel admin
    // qui n'est pas accessible avec anon key. Pour l'instant, on logout simplement.
    // Phase 2 : edge function avec service_role pour soft-delete réel.
    await auth.logout()
    alert('Pour supprimer définitivement ton compte, contacte le support (feature à venir).')
  }

  // ============ BETS (delegated to AuthContext) ============
  const addBet = (bet) => auth.addBet(bet)
  const updateBet = (id, patch) => auth.updateBet(id, patch)
  const deleteBet = (id) => auth.deleteBet(id)
  const settleBet = (id, status, cashout) => {
    const patch = { status }
    if (status === 'cashout' && cashout != null) patch.cashout = cashout
    return auth.updateBet(id, patch)
  }
  const settleComboMatch = (betId, matchIdx, matchStatus) =>
    auth.settleComboMatch(betId, matchIdx, matchStatus)

  // ============ MONÉTISATION (sur cloud profile) ============
  const FREE_QUOTAS = { addBet: 10, customPlayer: 1, insightUnlock: 1 }

  const checkQuota = (action) => {
    if (!user) return { allowed: false, reason: 'no-user' }
    if (user.plan === 'premium' || user.plan === 'pro' || user.plan === 'sharp') {
      return { allowed: true, premium: true }
    }
    const max = FREE_QUOTAS[action] ?? Infinity
    const credits = user.adCredits?.[action] || 0
    let used = 0
    if (action === 'addBet') used = user.monthlyBetCount || 0
    if (action === 'customPlayer') used = (user.customPlayers || []).length
    if (action === 'insightUnlock') used = 0
    const limit = max + credits
    return {
      allowed: used < limit,
      used, max, credits, limit,
      reason: used >= limit ? 'quota-exceeded' : null,
    }
  }

  const consumeQuota = (action) => {
    if (!user || user.plan !== 'free') return
    if (action === 'addBet') {
      auth.updateProfile({ monthlyBetCount: (user.monthlyBetCount || 0) + 1 })
    }
  }

  const grantAdCredit = (action) => {
    if (!user) return
    const credits = user.adCredits || { addBet: 0, customPlayer: 0, insightUnlock: 0 }
    auth.updateProfile({ adCredits: { ...credits, [action]: (credits[action] || 0) + 1 } })
  }

  const upgradeToPremium = () => auth.updateProfile({ plan: 'pro' })
  const downgradeToFree = () => auth.updateProfile({ plan: 'free' })

  // ============ AMIS — VRAIES TABLES SUPABASE ============
  const [friends, setFriends] = useState([])           // liste user IDs
  const [friendRequests, setFriendRequests] = useState([]) // demandes reçues pending

  const loadFriends = useCallback(async () => {
    if (!user?.id) return
    // 1. Récupère les IDs des amis
    const { data: links, error: fErr } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', user.id)
    if (fErr || !links || links.length === 0) {
      setFriends([])
      return
    }
    const friendIds = links.map(l => l.friend_id)
    // 2. Récupère les profils correspondants
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, plan, avatar_key')
      .in('id', friendIds)
    if (pErr) {
      setFriends([])
      return
    }
    setFriends((profiles || []).map(p => ({
      id: p.id,
      username: p.username,
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      firstName: p.first_name || '',
      lastName: p.last_name || '',
      plan: p.plan,
      avatar_key: p.avatar_key || null,
      avatarKey: p.avatar_key || null,
    })))
  }, [user?.id])

  const loadFriendRequests = useCallback(async () => {
    if (!user?.id) return
    const { data, error: rErr } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
    if (!rErr) setFriendRequests(data || [])
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      loadFriends()
      loadFriendRequests()
    } else {
      setFriends([])
      setFriendRequests([])
    }
  }, [user?.id, loadFriends, loadFriendRequests])

  // Send a friend request to a user (par username)
  const sendFriendRequest = async (targetUsername) => {
    if (!user?.id || !targetUsername) return { ok: false, error: 'Invalid' }
    const clean = targetUsername.trim().toLowerCase()
    if (clean === user.username) return { ok: false, error: "C'est toi-même 😄" }

    // Trouver l'user cible
    const { data: target, error: tErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', clean)
      .maybeSingle()
    if (tErr || !target) return { ok: false, error: 'Utilisateur introuvable' }

    // Insert friend_request
    const { error: insErr } = await supabase
      .from('friend_requests')
      .insert({ from_user_id: user.id, to_user_id: target.id })
    if (insErr) {
      if (insErr.code === '23505') return { ok: false, error: 'Demande déjà envoyée' }
      return { ok: false, error: insErr.message }
    }
    return { ok: true }
  }

  const acceptFriendRequest = async (requestId) => {
    const { error: aErr } = await supabase.rpc('accept_friend_request', { request_id: requestId })
    if (aErr) return { ok: false, error: aErr.message }
    await loadFriends()
    await loadFriendRequests()
    return { ok: true }
  }

  const rejectFriendRequest = async (requestId) => {
    await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId)
    await loadFriendRequests()
  }

  const removeFriend = async (otherUserId) => {
    await supabase.rpc('remove_friend', { other_user_id: otherUserId })
    await loadFriends()
  }

  // Fonction legacy pour compat — addFriend(username) renvoie vers sendFriendRequest
  const addFriend = (username) => sendFriendRequest(username)

  // ============ SEED DEMO (compat) — désactivé en cloud ============
  const seedDemoData = () => {
    alert('Données de démo désactivées en mode cloud. Crée tes paris réels !')
  }

  const value = {
    state: { users: {}, currentUser: user?.id }, // back-compat seulement
    user, isAuth, coins, notifications,
    isLoading, authError,

    login, logout, resetCurrentUser, deleteCurrentUser,
    updateUser, setBankroll, setCurrency, setOnboardingDone,
    refreshProfile: auth.refreshProfile,
    updateStrategy, updateGoals, ignoreAlert,
    addBet, updateBet, deleteBet, settleBet, settleComboMatch,
    addCustomBetType, removeCustomBetType, allBetTypes,
    allPlayers, findPlayer, ensurePlayer, removeCustomPlayer, addCustomPlayer, updateCustomPlayer,
    seedDemoData,

    // monétisation
    checkQuota, consumeQuota, grantAdCredit, upgradeToPremium, downgradeToFree,
    FREE_QUOTAS,

    // social — VRAI cloud
    updatePrivacy,
    friends, friendRequests,
    sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
    addFriend, // alias compat
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
