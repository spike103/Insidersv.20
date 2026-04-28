// supabase/functions/compute_weekly_challenge/index.ts
//
// Cette Edge Function résout les challenges arrivés à terme :
// 1. Pour chaque challenge active dont ends_at < now()
// 2. Calcule le rang final de chaque participant
// 3. Distribue les crédits aux winners selon les rewards
// 4. Marque le challenge comme 'computed'
//
// À déclencher via cron pg_cron une fois par semaine (dimanche 23h59)
// OU à invoquer manuellement pour tester

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

Deno.serve(async (_req: Request) => {
  try {
    // 1. Trouve les challenges expirés mais pas encore computés
    const { data: challenges, error: cErr } = await adminClient
      .from('challenges')
      .select('*')
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString())

    if (cErr) throw cErr
    if (!challenges || challenges.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No challenges to compute' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let totalAwarded = 0

    for (const challenge of challenges) {
      // 2. Récupère les participants triés par metric_value desc
      const { data: participants } = await adminClient
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('metric_value', { ascending: false })

      if (!participants || participants.length === 0) {
        // Marquer comme computed quand même (challenge sans participant)
        await adminClient
          .from('challenges')
          .update({ status: 'computed' })
          .eq('id', challenge.id)
        continue
      }

      // 3. Filtrer les éligibles (minBets respecté)
      const minBets = challenge.rules?.minBets || 0
      const eligible = participants.filter(p => p.bets_count >= minBets)

      // 4. Distribuer les crédits aux 3 premiers (ou plus si rewards en a plus)
      const rewards = challenge.rewards || {}
      for (let i = 0; i < eligible.length; i++) {
        const p = eligible[i]
        const rank = i + 1
        const credits = rewards[String(rank)] || 0

        // Update le rang
        await adminClient
          .from('challenge_participants')
          .update({
            rank,
            reward_credits: credits,
            computed_at: new Date().toISOString(),
          })
          .eq('challenge_id', challenge.id)
          .eq('user_id', p.user_id)

        // Distribuer les crédits si il y en a
        if (credits > 0) {
          // Lire le solde actuel
          const { data: prof } = await adminClient
            .from('profiles')
            .select('credits')
            .eq('id', p.user_id)
            .single()

          if (prof) {
            await adminClient
              .from('profiles')
              .update({ credits: (prof.credits || 0) + credits })
              .eq('id', p.user_id)

            // Logger la transaction
            await adminClient
              .from('credit_transactions')
              .insert({
                user_id: p.user_id,
                amount: credits,
                reason: 'challenge_win',
                metadata: {
                  challenge_id: challenge.id,
                  challenge_title: challenge.title,
                  rank,
                },
              })

            totalAwarded += credits
          }
        }
      }

      // 5. Marquer le challenge comme computed
      await adminClient
        .from('challenges')
        .update({ status: 'computed' })
        .eq('id', challenge.id)
    }

    return new Response(
      JSON.stringify({
        ok: true,
        challenges_computed: challenges.length,
        total_credits_awarded: totalAwarded,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[compute_weekly_challenge] fatal error:', e)
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
