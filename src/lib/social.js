// src/lib/social.js
//
// Helpers DB pour les features sociales :
//   - Challenges hebdo
//   - Pari communautaire (publier + voter)
//   - Battles 1v1

import { supabase } from './supabase.js'

// ============================================================
// CHALLENGES
// ============================================================

// Récupère le challenge actif (status = 'active' et dans la fenêtre temporelle)
export async function fetchActiveChallenge() {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('status', 'active')
    .lte('starts_at', new Date().toISOString())
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: false })
    .limit(1)
  if (error) {
    console.error('[fetchActiveChallenge]', error)
    return null
  }
  return data?.[0] || null
}

// Récupère les participants d'un challenge avec profils (pour leaderboard)
export async function fetchChallengeLeaderboard(challengeId) {
  if (!challengeId) return []
  // 1. Participants
  const { data: participants } = await supabase
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('metric_value', { ascending: false })
    .limit(50)
  if (!participants || participants.length === 0) return []

  // 2. Profils correspondants
  const userIds = participants.map(p => p.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, plan, avatar_key')
    .in('id', userIds)

  // 3. Merge
  const profilesById = new Map((profiles || []).map(p => [p.id, p]))
  return participants.map((p, i) => {
    const profile = profilesById.get(p.user_id) || {}
    return {
      ...p,
      rank: p.rank || i + 1,
      username: profile.username,
      first_name: profile.first_name,
      last_name: profile.last_name,
      plan: profile.plan,
      avatarKey: profile.avatar_key || null,
    }
  })
}

// Calcul côté client de la métrique d'un user pour un challenge donné
// (utile pour afficher la métrique en temps réel sur la page challenges, sans cron)
export function computeUserMetricForChallenge(bets, challenge) {
  if (!challenge?.rules || !bets) return { value: 0, betsCount: 0, eligible: false }
  const rules = challenge.rules
  const startsAt = new Date(challenge.starts_at).getTime()
  const endsAt = new Date(challenge.ends_at).getTime()

  // Filtrer les bets dans la fenêtre + selon le sport
  const relevant = bets.filter(b => {
    const t = new Date(b.date).getTime()
    if (t < startsAt || t > endsAt) return false
    if (rules.sport && b.sport !== rules.sport) return false
    if (rules.surface && b.surface !== rules.surface) return false
    if (b.status === 'pending' || b.status === 'void') return false
    return true
  })

  if (relevant.length === 0) return { value: 0, betsCount: 0, eligible: false }

  // Calcul de la métrique demandée
  let value = 0
  if (rules.metric === 'roi') {
    const totalStake = relevant.reduce((a, b) => a + b.stake, 0)
    const totalProfit = relevant.reduce((a, b) => {
      if (b.status === 'won') return a + b.stake * (b.odd - 1)
      if (b.status === 'lost') return a - b.stake
      if (b.status === 'cashout') return a + ((b.cashout || 0) - b.stake)
      return a
    }, 0)
    value = totalStake > 0 ? (totalProfit / totalStake) * 100 : 0
  } else if (rules.metric === 'profit') {
    value = relevant.reduce((a, b) => {
      if (b.status === 'won') return a + b.stake * (b.odd - 1)
      if (b.status === 'lost') return a - b.stake
      if (b.status === 'cashout') return a + ((b.cashout || 0) - b.stake)
      return a
    }, 0)
  } else if (rules.metric === 'winrate') {
    const won = relevant.filter(b => b.status === 'won').length
    value = (won / relevant.length) * 100
  }

  const minBets = rules.minBets || 0
  const eligible = relevant.length >= minBets

  return { value, betsCount: relevant.length, eligible, minBets }
}

// Update le leaderboard côté client (insert ou update sa propre ligne)
// → permet à un user de voir son rang en temps réel sans attendre le cron
export async function upsertMyChallengeProgress(challengeId, userId, betsCount, metricValue) {
  if (!challengeId || !userId) return
  await supabase
    .from('challenge_participants')
    .upsert({
      challenge_id: challengeId,
      user_id: userId,
      bets_count: betsCount,
      metric_value: metricValue,
      computed_at: new Date().toISOString(),
    })
}

// ============================================================
// PARI COMMUNAUTAIRE
// ============================================================

// Récupère les paris publiés (mur public) avec leurs auteurs
export async function fetchPublishedBets(limit = 30) {
  const { data: pubs, error } = await supabase
    .from('published_bets')
    .select('*')
    .eq('status', 'pending') // que les paris encore en cours
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[fetchPublishedBets]', error)
    return []
  }
  if (!pubs || pubs.length === 0) return []

  // Récupérer les bets associés
  const betIds = pubs.map(p => p.bet_id)
  const { data: bets } = await supabase
    .from('bets')
    .select('id, sport, mode, stake, odd, bet_date, data')
    .in('id', betIds)
  const betsById = new Map((bets || []).map(b => [b.id, b]))

  // Récupérer les profils
  const userIds = [...new Set(pubs.map(p => p.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_key, plan')
    .in('id', userIds)
  const profilesById = new Map((profiles || []).map(p => [p.id, p]))

  return pubs.map(p => ({
    ...p,
    bet: betsById.get(p.bet_id) || null,
    author: profilesById.get(p.user_id) || null,
  }))
}

// Récupère mes votes sur les paris publiés (pour savoir lesquels j'ai déjà votés)
export async function fetchMyVotes(userId) {
  if (!userId) return new Map()
  const { data } = await supabase
    .from('bet_votes')
    .select('published_bet_id, vote')
    .eq('user_id', userId)
  return new Map((data || []).map(v => [v.published_bet_id, v.vote]))
}

// Publier un de mes paris pending
export async function publishBet(userId, betId, caption) {
  if (!userId || !betId) return { ok: false, error: 'invalid params' }
  const { error } = await supabase
    .from('published_bets')
    .insert({ user_id: userId, bet_id: betId, caption: caption || null })
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'already_published' }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

// Voter sur un pari publié (yes / no)
// Si l'user a déjà voté, on update son vote
export async function voteOnPublishedBet(userId, publishedBetId, vote) {
  if (!userId || !publishedBetId) return { ok: false, error: 'invalid params' }
  if (vote !== 'yes' && vote !== 'no') return { ok: false, error: 'invalid vote' }
  // Upsert
  const { error } = await supabase
    .from('bet_votes')
    .upsert({
      published_bet_id: publishedBetId,
      user_id: userId,
      vote,
    })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// Supprimer ma publication
export async function unpublishBet(userId, publishedBetId) {
  if (!userId || !publishedBetId) return { ok: false }
  await supabase
    .from('published_bets')
    .delete()
    .eq('id', publishedBetId)
    .eq('user_id', userId)
  return { ok: true }
}

// ============================================================
// BATTLES 1v1
// ============================================================

// Récupère mes battles (en cours, en attente, terminées)
export async function fetchMyBattles(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    console.error('[fetchMyBattles]', error)
    return []
  }
  if (!data || data.length === 0) return []

  // Récupérer les profils des adversaires
  const userIds = [...new Set([
    ...data.map(b => b.challenger_id),
    ...data.map(b => b.opponent_id),
  ])]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_key, plan')
    .in('id', userIds)
  const profilesById = new Map((profiles || []).map(p => [p.id, p]))

  return data.map(b => ({
    ...b,
    challenger: profilesById.get(b.challenger_id) || null,
    opponent: profilesById.get(b.opponent_id) || null,
    iAmChallenger: b.challenger_id === userId,
  }))
}

// Créer une battle (= défier un ami)
export async function createBattle(challengerId, opponentId, opts = {}) {
  if (!challengerId || !opponentId) return { ok: false, error: 'invalid params' }
  if (challengerId === opponentId) return { ok: false, error: 'cannot battle yourself' }

  const startsAt = opts.startsAt || new Date()
  const endsAt = opts.endsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 jours par défaut

  const { error } = await supabase
    .from('battles')
    .insert({
      challenger_id: challengerId,
      opponent_id: opponentId,
      metric: opts.metric || 'roi',
      stake: opts.stake || 10,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// Accepter une battle (passe de pending à active)
export async function acceptBattle(battleId, userId) {
  if (!battleId) return { ok: false }
  const { error } = await supabase
    .from('battles')
    .update({ status: 'active' })
    .eq('id', battleId)
    .eq('opponent_id', userId)
    .eq('status', 'pending')
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// Refuser une battle
export async function rejectBattle(battleId, userId) {
  if (!battleId) return { ok: false }
  const { error } = await supabase
    .from('battles')
    .update({ status: 'rejected' })
    .eq('id', battleId)
    .eq('opponent_id', userId)
    .eq('status', 'pending')
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
