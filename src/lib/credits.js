// src/lib/credits.js
//
// Helpers pour le système de crédits.
// Les crédits sont stockés dans profiles.credits côté DB.
// Chaque transaction est loggée dans credit_transactions.
//
// Côté logique de gain :
//   - Au signup : +5 (mission 'signup')
//   - Au premier pari : +5 (mission 'first_bet')
//   - À chaque pari gagné : +1 (mission 'win')
//   - Série de 3 wins : +5 (mission 'streak_3')
//   - 7 jours d'affilée connecté : +10 (mission 'login_7d')
//   - Profil complété (avatar + au moins 1 pari) : +5 (mission 'profile_complete')

import { supabase } from './supabase.js'

// Catalogue des missions (côté frontend pour affichage)
// Doit correspondre à la table missions côté DB
export const MISSIONS = [
  {
    id: 'signup',
    title: 'Créer ton compte',
    description: 'Bienvenue dans Insiders',
    reward: 5,
    autoCompleted: true, // attribué automatiquement par le système
  },
  {
    id: 'first_bet',
    title: 'Ajouter ton premier pari',
    description: 'Lance-toi, le tracking commence ici',
    reward: 5,
  },
  {
    id: 'win',
    title: 'Pari gagné',
    description: 'Reçois 1 crédit par pari validé gagnant',
    reward: 1,
    repeatable: true,
  },
  {
    id: 'streak_3',
    title: 'Série de 3 victoires',
    description: 'Bonus pour une série de 3 paris gagnés d\'affilée',
    reward: 5,
    repeatable: true,
  },
  {
    id: 'login_7d',
    title: 'Connecte-toi 7 jours d\'affilée',
    description: 'Récompense de fidélité',
    reward: 10,
    repeatable: true,
  },
  {
    id: 'profile_complete',
    title: 'Compléter ton profil',
    description: 'Choisis un avatar + ajoute ton premier pari',
    reward: 5,
  },
]

// Catalogue des features achetables avec des crédits
export const REWARDS_CATALOG = [
  { id: 'unlock_pro_1mo',   title: '1 mois Pro',          description: 'Débloque tout du plan Pro pendant 30 jours', cost: 100, icon: 'star' },
  { id: 'unlock_sharp_1mo', title: '1 mois Sharp',        description: 'Débloque tout du plan Sharp pendant 30 jours', cost: 250, icon: 'crown' },
  { id: 'lift_ocr_quota',   title: 'Lever quota OCR mois', description: 'Scan ticket illimité pour le mois en cours', cost: 30,  icon: 'sparkle' },
  { id: 'unlock_insight',   title: 'Débloquer 1 insight premium', description: 'Accès à un insight premium ce mois', cost: 10,  icon: 'sparkle' },
  { id: 'custom_player',    title: 'Joueur personnalisé',  description: '+1 joueur custom au-delà du quota Free', cost: 5,   icon: 'add' },
]

// Catalogue des packs Stripe (V2 — Phase C)
export const PURCHASE_PACKS = [
  { id: 'pack_starter',  title: 'Starter',  price: '1,99€', credits: 50,  bonus: 0 },
  { id: 'pack_standard', title: 'Standard', price: '4,99€', credits: 150, bonus: 10, popular: true },
  { id: 'pack_pro',      title: 'Pro',      price: '9,99€', credits: 350, bonus: 50 },
]

// ============================================================
// HELPERS DB — appelés depuis AuthContext et autres composants
// ============================================================

// Crédite des crédits à un user en loggant la transaction
// → Appelé depuis : signup, addBet (first_bet), win settle, etc.
export async function awardCredits(userId, amount, reason, metadata = {}) {
  if (!userId || !amount) return { ok: false, error: 'invalid params' }

  // 1. Lire le solde actuel
  const { data: prof, error: rErr } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()
  if (rErr) return { ok: false, error: rErr.message }

  const newBalance = (prof.credits || 0) + amount

  // 2. Update le solde
  const { error: uErr } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', userId)
  if (uErr) return { ok: false, error: uErr.message }

  // 3. Logger la transaction (audit trail)
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount,
    reason,
    metadata,
  })

  return { ok: true, newBalance }
}

// Dépense des crédits sur une feature du REWARDS_CATALOG
// Vérifie que le solde est suffisant avant la dépense
export async function spendCredits(userId, rewardId) {
  const reward = REWARDS_CATALOG.find(r => r.id === rewardId)
  if (!reward) return { ok: false, error: 'reward not found' }

  // 1. Lire le solde actuel
  const { data: prof, error: rErr } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()
  if (rErr) return { ok: false, error: rErr.message }

  const balance = prof.credits || 0
  if (balance < reward.cost) {
    return { ok: false, error: 'insufficient_credits', balance, needed: reward.cost }
  }

  // 2. Décrémenter
  const { error: uErr } = await supabase
    .from('profiles')
    .update({ credits: balance - reward.cost })
    .eq('id', userId)
  if (uErr) return { ok: false, error: uErr.message }

  // 3. Logger
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -reward.cost,
    reason: rewardId,
    metadata: { reward_title: reward.title },
  })

  // 4. Appliquer l'effet de la reward
  // (Dans cette V1 simple, on ne fait que débiter. Les effets concrets
  // — ex. débloquer Pro 1 mois — viendront dans une V2 quand on
  // aura un système d'unlock temporaire.)

  return { ok: true, newBalance: balance - reward.cost }
}

// Récupère les transactions récentes (pour l'historique)
export async function fetchTransactions(userId, limit = 30) {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data || []
}
