// supabase/functions/compute_battles/index.ts
//
// Cette Edge Function résout les battles 1v1 arrivées à terme :
// 1. Pour chaque battle active dont ends_at < now()
// 2. Calcule le ROI/profit/winrate de chaque participant sur la période
// 3. Désigne le winner et transfère les crédits du loser au winner
// 4. Marque la battle comme 'computed'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Calcule la métrique d'un user sur une fenêtre temporelle
async function computeUserMetric(userId: string, startsAt: string, endsAt: string, metric: string): Promise<number> {
  const { data: bets } = await adminClient
    .from('bets')
    .select('stake, odd, status, cashout_amount')
    .eq('user_id', userId)
    .gte('bet_date', startsAt)
    .lte('bet_date', endsAt)
    .in('status', ['won', 'lost', 'cashout'])

  if (!bets || bets.length === 0) return 0

  if (metric === 'roi') {
    const totalStake = bets.reduce((a, b) => a + Number(b.stake), 0)
    const totalProfit = bets.reduce((a, b) => {
      if (b.status === 'won') return a + Number(b.stake) * (Number(b.odd) - 1)
      if (b.status === 'lost') return a - Number(b.stake)
      if (b.status === 'cashout') return a + ((Number(b.cashout_amount) || 0) - Number(b.stake))
      return a
    }, 0)
    return totalStake > 0 ? (totalProfit / totalStake) * 100 : 0
  } else if (metric === 'profit') {
    return bets.reduce((a, b) => {
      if (b.status === 'won') return a + Number(b.stake) * (Number(b.odd) - 1)
      if (b.status === 'lost') return a - Number(b.stake)
      if (b.status === 'cashout') return a + ((Number(b.cashout_amount) || 0) - Number(b.stake))
      return a
    }, 0)
  } else if (metric === 'winrate') {
    const won = bets.filter(b => b.status === 'won').length
    return (won / bets.length) * 100
  }
  return 0
}

Deno.serve(async (_req: Request) => {
  try {
    // 1. Trouve les battles actives expirées
    const { data: battles, error: bErr } = await adminClient
      .from('battles')
      .select('*')
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString())

    if (bErr) throw bErr
    if (!battles || battles.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No battles to compute' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let resolved = 0

    for (const b of battles) {
      const challengerValue = await computeUserMetric(
        b.challenger_id,
        b.starts_at,
        b.ends_at,
        b.metric || 'roi'
      )
      const opponentValue = await computeUserMetric(
        b.opponent_id,
        b.starts_at,
        b.ends_at,
        b.metric || 'roi'
      )

      // Détermine le winner (égalité = challenger gagne par défaut, ou null si vraiment égalité)
      let winnerId: string | null = null
      let loserId: string | null = null
      if (challengerValue > opponentValue) {
        winnerId = b.challenger_id
        loserId = b.opponent_id
      } else if (opponentValue > challengerValue) {
        winnerId = b.opponent_id
        loserId = b.challenger_id
      }
      // Si égalité parfaite : pas de winner, pas de transfer

      // Update la battle
      await adminClient
        .from('battles')
        .update({
          status: 'computed',
          challenger_value: challengerValue,
          opponent_value: opponentValue,
          winner_id: winnerId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', b.id)

      // Transfer des crédits si winner défini
      if (winnerId && loserId && b.stake > 0) {
        // Crédite winner
        const { data: winnerProf } = await adminClient
          .from('profiles')
          .select('credits')
          .eq('id', winnerId)
          .single()
        if (winnerProf) {
          await adminClient
            .from('profiles')
            .update({ credits: (winnerProf.credits || 0) + b.stake })
            .eq('id', winnerId)
          await adminClient.from('credit_transactions').insert({
            user_id: winnerId,
            amount: b.stake,
            reason: 'battle_win',
            metadata: { battle_id: b.id },
          })
        }

        // Débite loser (jusqu'à 0, on n'autorise pas un solde négatif)
        const { data: loserProf } = await adminClient
          .from('profiles')
          .select('credits')
          .eq('id', loserId)
          .single()
        if (loserProf) {
          const debit = Math.min(b.stake, loserProf.credits || 0)
          await adminClient
            .from('profiles')
            .update({ credits: (loserProf.credits || 0) - debit })
            .eq('id', loserId)
          await adminClient.from('credit_transactions').insert({
            user_id: loserId,
            amount: -debit,
            reason: 'battle_loss',
            metadata: { battle_id: b.id },
          })
        }
      }

      resolved++
    }

    return new Response(
      JSON.stringify({ ok: true, resolved }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[compute_battles] fatal error:', e)
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
