import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './useAuth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { session, user: authUser, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [bets, setBets] = useState([])
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState(null)

  // Helper : convertit row DB → format frontend (camelCase)
  const dbProfileToFrontend = (row) => ({
    id: row.id,
    username: row.username,
    pseudo: row.username, // back-compat
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    createdAt: row.created_at,
    bankrollStart: Number(row.bankroll_start),
    bankrollCurrent: Number(row.bankroll_current),
    currency: row.currency || '€',
    plan: row.plan || 'free',
    monthlyBetCount: row.monthly_bet_count || 0,
    monthlyResetAt: row.monthly_reset_at,
    adCredits: row.ad_credits || { addBet: 0, customPlayer: 0, insightUnlock: 0 },
    privacy: {
      showStats: row.privacy_show_stats || 'friends',
      showPendingBets: row.privacy_show_pending_bets || 'friends',
      showInLeaderboard: row.privacy_show_in_leaderboard !== false,
    },
    lastBookmaker: row.last_bookmaker || '',
    strategy: row.strategy || { flatAmount: 10, percentAmount: 2 },
    goals: row.goals || {},
    customPlayers: row.custom_players || [],
    customBetTypes: row.custom_bet_types || [],
    onboardingDone: row.onboarding_done === true,
    alertsIgnored: row.alerts_ignored || [],
    alertsActivated: row.alerts_activated || [],
    avatarKey: row.avatar_key || null,
    credits: row.credits || 0,
  })

  const dbBetToFrontend = (row) => ({
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    status: row.status,
    sport: row.sport,
    mode: row.mode,
    stake: Number(row.stake),
    odd: Number(row.odd),
    date: row.bet_date,
    tour: row.tour,
    surface: row.surface,
    bookmaker: row.bookmaker,
    confidence: row.confidence,
    reflectionSeconds: row.reflection_seconds,
    cashout: row.cashout_amount ? Number(row.cashout_amount) : null,
    // Étend avec les champs du jsonb data
    ...(row.data || {}),
  })

  // 1. Charge le profil dès qu'on a un user authentifié
  const loadProfile = useCallback(async (userId) => {
    if (!userId) return
    setProfileLoading(true)
    setError(null)
    try {
      const { data, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (pErr) {
        // Si pas de profil (cas rare où le trigger handle_new_user a échoué) : on en crée un
        if (pErr.code === 'PGRST116') {
          // Pas de profil trouvé — il devrait avoir été créé par le trigger
          // Essai : récupérer username depuis user_metadata
          const meta = authUser?.user_metadata || {}
          const fallbackUsername = meta.username || `user_${userId.slice(0, 8)}`
          const { data: created, error: createErr } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              username: fallbackUsername,
              first_name: meta.first_name || '',
              last_name: meta.last_name || '',
              email: authUser?.email,
              bankroll_start: meta.bankroll_start || 500,
              bankroll_current: meta.bankroll_start || 500,
            })
            .select()
            .single()
          if (createErr) throw createErr
          setProfile(dbProfileToFrontend(created))
        } else {
          throw pErr
        }
      } else {
        setProfile(dbProfileToFrontend(data))
      }
    } catch (e) {
      console.error('[loadProfile]', e)
      setError(e.message)
    } finally {
      setProfileLoading(false)
    }
  }, [authUser])

  // 2. Charge les bets
  const loadBets = useCallback(async (userId) => {
    if (!userId) return
    try {
      const { data, error: bErr } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', userId)
        .order('bet_date', { ascending: false })
      if (bErr) throw bErr
      setBets((data || []).map(dbBetToFrontend))
    } catch (e) {
      console.error('[loadBets]', e)
    }
  }, [])

  // 3. Effet : quand un user se connecte, charger profile + bets
  useEffect(() => {
    if (authUser?.id) {
      loadProfile(authUser.id)
      loadBets(authUser.id)
    } else {
      setProfile(null)
      setBets([])
    }
  }, [authUser?.id, loadProfile, loadBets])

  // 4. REALTIME : écoute les changements sur la table bets pour ce user
  // Ainsi quand l'edge function auto_settle_bets met à jour un bet (pending → won/lost),
  // l'UI se met à jour automatiquement sans avoir à recharger la page.
  useEffect(() => {
    if (!authUser?.id) return

    const channel = supabase
      .channel(`bets_${authUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bets',
          filter: `user_id=eq.${authUser.id}`,
        },
        (payload) => {
          // payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = dbBetToFrontend(payload.new)
            setBets(prev => prev.map(b => b.id === updated.id ? updated : b))
            // Si le bet a été auto-settled (était pending, n'est plus), on rafraîchit aussi le profile
            // (la bankroll a peut-être bougé)
            if (payload.old?.status === 'pending' && payload.new.status !== 'pending') {
              loadProfile(authUser.id)
            }
          } else if (payload.eventType === 'INSERT' && payload.new) {
            const created = dbBetToFrontend(payload.new)
            setBets(prev => prev.some(b => b.id === created.id) ? prev : [created, ...prev])
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setBets(prev => prev.filter(b => b.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [authUser?.id, loadProfile])

  // ============ ACTIONS ============

  // SIGNUP : email/password + profile data
  const signup = async ({ firstName, lastName, email, password, username, bankrollStart }) => {
    const cleanUsername = (username || '').trim().toLowerCase()
    if (!cleanUsername) return { ok: false, error: 'Username obligatoire' }

    // 1. Vérifier que le username n'est pas pris (table publique avec policy "anyone can read leaderboard")
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle()
    if (existing) return { ok: false, error: 'Username déjà pris' }

    // 2. Inscription Supabase Auth — le trigger créera automatiquement le profil
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          first_name: firstName,
          last_name: lastName,
          bankroll_start: Number(bankrollStart) || 500,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    })

    if (signErr) return { ok: false, error: signErr.message }

    // 3. Mettre à jour le profil avec la bankroll (le trigger n'a pas accès aux options.data.bankroll_start)
    //    + attribuer les 5 crédits du signup
    if (data.user) {
      await supabase
        .from('profiles')
        .update({
          bankroll_start: Number(bankrollStart) || 500,
          bankroll_current: Number(bankrollStart) || 500,
          credits: 5, // bonus signup
        })
        .eq('id', data.user.id)

      // Logger la transaction (audit trail)
      await supabase.from('credit_transactions').insert({
        user_id: data.user.id,
        amount: 5,
        reason: 'signup',
      })
    }

    // Si confirm-email actif, l'user n'est pas connecté immédiatement
    return {
      ok: true,
      needsEmailConfirmation: !data.session, // si session = null, faut confirmer email
    }
  }

  const login = async (email, password) => {
    const { error: lErr } = await supabase.auth.signInWithPassword({ email, password })
    if (lErr) return { ok: false, error: lErr.message }
    return { ok: true }
  }

  const loginWithMagicLink = async (email) => {
    const { error: mErr } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (mErr) return { ok: false, error: mErr.message }
    return { ok: true }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setBets([])
  }

  const updateProfile = async (patch) => {
    if (!profile?.id) return { ok: false }
    // Convert frontend → DB columns
    const dbPatch = {}
    if ('firstName' in patch) dbPatch.first_name = patch.firstName
    if ('lastName' in patch) dbPatch.last_name = patch.lastName
    if ('bankrollStart' in patch) dbPatch.bankroll_start = patch.bankrollStart
    if ('bankrollCurrent' in patch) dbPatch.bankroll_current = patch.bankrollCurrent
    if ('currency' in patch) dbPatch.currency = patch.currency
    if ('plan' in patch) dbPatch.plan = patch.plan
    if ('monthlyBetCount' in patch) dbPatch.monthly_bet_count = patch.monthlyBetCount
    if ('monthlyResetAt' in patch) dbPatch.monthly_reset_at = patch.monthlyResetAt
    if ('adCredits' in patch) dbPatch.ad_credits = patch.adCredits
    if ('lastBookmaker' in patch) dbPatch.last_bookmaker = patch.lastBookmaker
    if ('strategy' in patch) dbPatch.strategy = patch.strategy
    if ('goals' in patch) dbPatch.goals = patch.goals
    if ('customPlayers' in patch) dbPatch.custom_players = patch.customPlayers
    if ('customBetTypes' in patch) dbPatch.custom_bet_types = patch.customBetTypes
    if ('onboardingDone' in patch) dbPatch.onboarding_done = patch.onboardingDone
    if ('alertsIgnored' in patch) dbPatch.alerts_ignored = patch.alertsIgnored
    if ('alertsActivated' in patch) dbPatch.alerts_activated = patch.alertsActivated
    if ('avatarKey' in patch) dbPatch.avatar_key = patch.avatarKey
    if ('privacy' in patch) {
      dbPatch.privacy_show_stats = patch.privacy.showStats
      dbPatch.privacy_show_pending_bets = patch.privacy.showPendingBets
      dbPatch.privacy_show_in_leaderboard = patch.privacy.showInLeaderboard
    }

    // Optimistic update
    setProfile(p => ({ ...p, ...patch, privacy: patch.privacy ? { ...p.privacy, ...patch.privacy } : p.privacy }))

    const { error: uErr } = await supabase
      .from('profiles')
      .update(dbPatch)
      .eq('id', profile.id)
    if (uErr) {
      console.error('[updateProfile]', uErr)
      // Revert : reload from DB
      loadProfile(profile.id)
      return { ok: false, error: uErr.message }
    }

    // Check si profile_complete est désormais éligible (avatar défini + au moins 1 pari)
    // Note : awardOneTimeMission est défini plus bas dans le composant (hoisted via const → access via closure)
    if ('avatarKey' in patch && patch.avatarKey && bets.length > 0) {
      // On déclenche après le return pour ne pas bloquer
      setTimeout(() => awardOneTimeMission(profile.id, 'profile_complete', 5), 100)
    }

    return { ok: true }
  }

  // ============ BETS ============

  const addBet = async (bet) => {
    if (!profile?.id) return null
    // Split champs colonnes vs jsonb data
    const {
      status, sport, mode, stake, odd, date, tour, surface, bookmaker, confidence, reflectionSeconds, cashout,
      ...dataFields
    } = bet
    const row = {
      user_id: profile.id,
      status: status || 'pending',
      sport: sport || 'tennis',
      mode: mode || 'simple',
      stake: Number(stake),
      odd: Number(odd),
      bet_date: date || new Date().toISOString(),
      tour, surface, bookmaker, confidence,
      reflection_seconds: reflectionSeconds,
      cashout_amount: cashout,
      data: dataFields,
    }
    const { data: inserted, error: insErr } = await supabase
      .from('bets')
      .insert(row)
      .select()
      .single()
    if (insErr) {
      console.error('[addBet]', insErr)
      return null
    }
    const newBet = dbBetToFrontend(inserted)
    setBets(prev => [newBet, ...prev])
    // Increment monthly counter
    await updateProfile({ monthlyBetCount: (profile.monthlyBetCount || 0) + 1 })

    // Mission "first_bet" (one-time) : c'est le tout premier pari ?
    // (si bets vide avant cet add — on l'a vérifié AVANT le push optimiste)
    const wasFirst = bets.length === 0
    if (wasFirst && profile?.id) {
      await awardOneTimeMission(profile.id, 'first_bet', 5)
    }

    // Mission "profile_complete" (one-time) : avatar choisi + au moins un pari
    if (profile?.avatarKey && profile?.id) {
      await awardOneTimeMission(profile.id, 'profile_complete', 5)
    }

    return newBet
  }

  // Helper : crédite une mission "one-time" si elle n'a jamais été créditée
  const awardOneTimeMission = async (userId, missionId, reward) => {
    try {
      // Vérifier si on a déjà awardé cette mission
      const { data: existing } = await supabase
        .from('credit_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('reason', missionId)
        .limit(1)

      if (existing && existing.length > 0) return // déjà fait

      // Lire solde et incrémenter
      const { data: prof } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()
      if (!prof) return

      const newBalance = (prof.credits || 0) + reward
      await supabase.from('profiles').update({ credits: newBalance }).eq('id', userId)
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: reward,
        reason: missionId,
      })

      loadProfile(userId)
    } catch (e) {
      console.error('[awardOneTimeMission]', missionId, e)
    }
  }

  const updateBet = async (id, patch) => {
    const dbPatch = {}
    if ('status' in patch) dbPatch.status = patch.status
    if ('cashout' in patch) dbPatch.cashout_amount = patch.cashout

    // Détection : pari qui passe pending → won
    // (on capture l'ancien status AVANT l'update optimiste)
    const oldBet = bets.find(b => b.id === id)
    const becomingWon = patch.status === 'won' && oldBet?.status === 'pending'

    // Optimistic
    setBets(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
    const { error: uErr } = await supabase
      .from('bets')
      .update(dbPatch)
      .eq('id', id)
    if (uErr) {
      console.error('[updateBet]', uErr)
      loadBets(profile?.id)
      return
    }

    // Award crédits sur win
    if (becomingWon && profile?.id) {
      await awardWinCredits(profile.id)
    }
  }

  // Helper : crédite +1 par win, +5 bonus si streak de 3
  const awardWinCredits = async (userId) => {
    try {
      // 1. +1 crédit pour le win lui-même
      const { data: prof } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()
      if (!prof) return
      let newBalance = (prof.credits || 0) + 1

      // 2. Détection streak de 3 wins consécutifs (sur les 3 derniers paris settled)
      const { data: recent } = await supabase
        .from('bets')
        .select('status, bet_date')
        .eq('user_id', userId)
        .in('status', ['won', 'lost', 'cashout', 'void'])
        .order('bet_date', { ascending: false })
        .limit(3)

      let streakBonus = 0
      if (recent && recent.length === 3 && recent.every(b => b.status === 'won')) {
        // Vérifier qu'on n'a pas déjà awardé ce streak
        // (Pour éviter les doublons : on regarde la dernière transaction streak_3
        // et on s'assure qu'elle date d'avant le dernier win.)
        const { data: lastStreak } = await supabase
          .from('credit_transactions')
          .select('created_at')
          .eq('user_id', userId)
          .eq('reason', 'streak_3')
          .order('created_at', { ascending: false })
          .limit(1)

        const oldestRecentDate = new Date(recent[2].bet_date).getTime()
        const lastStreakTime = lastStreak?.[0] ? new Date(lastStreak[0].created_at).getTime() : 0

        if (lastStreakTime < oldestRecentDate) {
          streakBonus = 5
          newBalance += 5
        }
      }

      // 3. Update solde + log transactions
      await supabase.from('profiles').update({ credits: newBalance }).eq('id', userId)
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: 1,
        reason: 'win',
      })
      if (streakBonus > 0) {
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: streakBonus,
          reason: 'streak_3',
        })
      }

      // Refresh local pour que la TopBar voie le nouveau solde
      loadProfile(userId)
    } catch (e) {
      console.error('[awardWinCredits]', e)
    }
  }

  const deleteBet = async (id) => {
    setBets(prev => prev.filter(b => b.id !== id))
    const { error: dErr } = await supabase.from('bets').delete().eq('id', id)
    if (dErr) {
      console.error('[deleteBet]', dErr)
      loadBets(profile?.id)
    }
  }

  // Settle un match individuel d'un combiné
  const settleComboMatch = async (betId, matchIdx, matchStatus) => {
    const bet = bets.find(b => b.id === betId)
    if (!bet || bet.mode !== 'combine' || !bet.matches) return
    const newMatches = bet.matches.map((m, i) =>
      i === matchIdx ? { ...m, status: matchStatus } : m
    )
    const allSettled = newMatches.every(m => m.status && m.status !== 'pending')
    let comboStatus = bet.status
    if (allSettled) {
      const anyLost = newMatches.some(m => m.status === 'lost')
      comboStatus = anyLost ? 'lost' : 'won'
    }

    // Optimistic
    setBets(prev => prev.map(b => b.id === betId ? { ...b, matches: newMatches, status: comboStatus } : b))

    // Persist : on update le data jsonb (qui contient matches) + le status
    const newData = { ...(bets.find(b => b.id === betId)?.data || {}), matches: newMatches }
    const { error: uErr } = await supabase
      .from('bets')
      .update({ status: comboStatus, data: { ...bet.data, matches: newMatches } })
      .eq('id', betId)
    if (uErr) {
      console.error('[settleComboMatch]', uErr)
      loadBets(profile?.id)
    }
  }

  const value = {
    // session
    session,
    authUser,
    isAuth: !!authUser,
    isLoading: authLoading || profileLoading,
    error,

    // profile + bets
    profile,
    bets,

    // actions
    signup, login, loginWithMagicLink, logout,
    updateProfile,
    addBet, updateBet, deleteBet, settleComboMatch,

    // refresh
    refresh: () => { loadProfile(authUser?.id); loadBets(authUser?.id) },
    refreshProfile: () => loadProfile(authUser?.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
