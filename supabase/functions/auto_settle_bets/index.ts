// supabase/functions/auto_settle_bets/index.ts
//
// Cette Edge Function tourne périodiquement (cron toutes les 5 min) et :
// 1. Récupère tous les paris pending de la DB
// 2. Pour chaque pari tennis simple, cherche le match correspondant via TennisApi
// 3. Si le match est terminé : met à jour status + profit
// 4. Crée une notification dans la table notifications (via insertion)
//
// Variables d'env nécessaires (Supabase Secrets) :
//   - RAPIDAPI_KEY
//   - RAPIDAPI_HOST (ex: tennisapi1.p.rapidapi.com)
//   - SUPABASE_URL (auto-injecté par Supabase)
//   - SUPABASE_SERVICE_ROLE_KEY (auto-injecté — accès complet pour bypass RLS lors des updates)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')
const RAPIDAPI_HOST = Deno.env.get('RAPIDAPI_HOST') || 'tennisapi1.p.rapidapi.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Client admin (bypass RLS) — utilisé uniquement côté serveur
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ============================================================
// HELPERS
// ============================================================

// Normalise un nom de joueur pour matching tolérant
// "Novak Djokovic" → "novak djokovic"
// "Djokovic, N." → "djokovic n"
// "Carlos Alcaraz Garfia" → "carlos alcaraz garfia"
function normalize(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Match approximatif : dernier nom contenu OU initiale + nom
function namesMatch(a: string, b: string): boolean {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return false
  if (na === nb) return true
  // Compare les "derniers mots" (= nom de famille)
  const lastA = na.split(' ').slice(-1)[0]
  const lastB = nb.split(' ').slice(-1)[0]
  if (lastA && lastA === lastB && lastA.length >= 4) return true
  return false
}

// Calcul du profit selon status
function computeProfit(stake: number, odd: number, status: string, cashout: number | null): number {
  if (status === 'won') return stake * (odd - 1)
  if (status === 'lost') return -stake
  if (status === 'cashout' && cashout != null) return cashout - stake
  return 0
}

// ============================================================
// API TENNIS — wrapper minimal
// ============================================================

async function fetchMatchesForDate(dateISO: string): Promise<any[]> {
  // dateISO format yyyy-mm-dd
  // L'endpoint exact varie selon le provider.
  // Pour tennisapi1 sur RapidAPI on utilise typiquement /api/tennis/events/<date>
  // → Si tu utilises un autre provider, adapte ici.
  const url = `https://${RAPIDAPI_HOST}/api/tennis/events/${dateISO}`
  try {
    const resp = await fetch(url, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY!,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    })
    if (!resp.ok) {
      console.error(`[TennisAPI] ${resp.status} ${resp.statusText}`)
      return []
    }
    const data = await resp.json()
    // tennisapi1 renvoie souvent { events: [...] } — on tente plusieurs structures
    return data.events || data.data || data.results || data || []
  } catch (e) {
    console.error('[TennisAPI] fetch error:', e)
    return []
  }
}

// Tente de trouver un match dans la liste qui correspond aux 2 joueurs
function findMatchInList(matches: any[], player1: string, player2: string): any | null {
  for (const m of matches) {
    // Différents providers structurent différemment — on essaye plusieurs chemins
    const home = m.homeTeam?.name || m.homeTeam || m.player1?.name || m.player1 || m.home || ''
    const away = m.awayTeam?.name || m.awayTeam || m.player2?.name || m.player2 || m.away || ''

    // P1 vs P2
    if (namesMatch(player1, home) && namesMatch(player2, away)) return { ...m, _winner: 'home' }
    // P1 vs P2 inversé
    if (namesMatch(player1, away) && namesMatch(player2, home)) return { ...m, _winner: 'away' }
  }
  return null
}

// Détermine le gagnant d'un match terminé
// Renvoie 'home' | 'away' | 'pending' | 'void'
function getMatchResult(match: any): 'home' | 'away' | 'pending' | 'void' {
  const status = (match.status?.code || match.status?.type || match.status || '').toString().toLowerCase()

  // Match pas fini → on skip
  if (!status.includes('finished') && !status.includes('ended') && !status.includes('complete')) {
    return 'pending'
  }

  // Match annulé / forfait
  if (status.includes('cancel') || status.includes('walkover') || status.includes('w/o') || status.includes('retired')) {
    return 'void'
  }

  // Score : on cherche le winner via différents paths
  if (match.winnerCode === 1 || match.winner === 'home') return 'home'
  if (match.winnerCode === 2 || match.winner === 'away') return 'away'

  // Fallback : compare scores totaux (sets gagnés)
  const homeScore = match.homeScore?.current ?? match.homeScore?.display ?? match.homeScore ?? 0
  const awayScore = match.awayScore?.current ?? match.awayScore?.display ?? match.awayScore ?? 0
  if (typeof homeScore === 'number' && typeof awayScore === 'number') {
    if (homeScore > awayScore) return 'home'
    if (awayScore > homeScore) return 'away'
  }

  return 'pending'
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (_req: Request) => {
  const startedAt = Date.now()
  let processed = 0
  let settled = 0
  let errors = 0

  try {
    // 1. Récupérer tous les bets pending tennis simples (pas combinés pour l'instant)
    const { data: pendingBets, error: pErr } = await adminClient
      .from('bets')
      .select('id, user_id, stake, odd, bet_date, sport, mode, data, status')
      .eq('status', 'pending')
      .eq('sport', 'tennis')
      .eq('mode', 'simple')
      .limit(100)

    if (pErr) throw pErr
    if (!pendingBets || pendingBets.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No pending bets', processed: 0, settled: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Group by date pour minimiser les appels API
    const betsByDate = new Map<string, typeof pendingBets>()
    for (const b of pendingBets) {
      const dateISO = (b.bet_date as string).slice(0, 10) // yyyy-mm-dd
      if (!betsByDate.has(dateISO)) betsByDate.set(dateISO, [])
      betsByDate.get(dateISO)!.push(b)
    }

    // 3. Pour chaque date, fetch les matchs UNE FOIS, puis match les bets
    for (const [dateISO, bets] of betsByDate) {
      const matches = await fetchMatchesForDate(dateISO)
      if (matches.length === 0) {
        console.log(`[${dateISO}] no matches returned by API`)
        continue
      }

      for (const bet of bets) {
        processed++
        try {
          const players = (bet.data as any)?.players || []
          if (players.length < 2) continue

          const found = findMatchInList(matches, players[0], players[1])
          if (!found) {
            console.log(`[bet ${bet.id}] no match found for ${players[0]} vs ${players[1]} on ${dateISO}`)
            continue
          }

          const result = getMatchResult(found)
          if (result === 'pending') continue // match pas encore fini

          let newStatus: 'won' | 'lost' | 'void' = 'void'
          if (result === 'void') {
            newStatus = 'void'
          } else {
            // Le user a-t-il parié sur le bon joueur ?
            const winnerSide = result // 'home' ou 'away'
            const userPickedSide = found._winner // côté de player1 selon notre matching
            const betType = (bet.data as any)?.betType || 'ml_p1'

            // ml_p1 = pari sur joueur 1 (= position home dans notre matching)
            // ml_p2 = pari sur joueur 2 (= position away)
            const userPickedHome = (betType === 'ml_p1' && userPickedSide === 'home')
              || (betType === 'ml_p2' && userPickedSide === 'away')
            const userPickedAway = (betType === 'ml_p1' && userPickedSide === 'away')
              || (betType === 'ml_p2' && userPickedSide === 'home')

            if (winnerSide === 'home' && userPickedHome) newStatus = 'won'
            else if (winnerSide === 'away' && userPickedAway) newStatus = 'won'
            else newStatus = 'lost'
          }

          // 4. Update le bet
          const { error: uErr } = await adminClient
            .from('bets')
            .update({ status: newStatus })
            .eq('id', bet.id)

          if (uErr) {
            console.error(`[bet ${bet.id}] update error:`, uErr)
            errors++
            continue
          }

          settled++

          // 5. Update bankroll du user (profile)
          const profit = computeProfit(Number(bet.stake), Number(bet.odd), newStatus, null)
          if (profit !== 0) {
            // Récupère bankroll actuel
            const { data: prof } = await adminClient
              .from('profiles')
              .select('bankroll_current')
              .eq('id', bet.user_id)
              .single()
            if (prof) {
              await adminClient
                .from('profiles')
                .update({ bankroll_current: Number(prof.bankroll_current) + profit })
                .eq('id', bet.user_id)
            }
          }

          console.log(`[bet ${bet.id}] settled as ${newStatus} (profit: ${profit.toFixed(2)})`)
        } catch (e) {
          console.error(`[bet ${bet.id}] processing error:`, e)
          errors++
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed,
        settled,
        errors,
        durationMs: Date.now() - startedAt,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[auto_settle_bets] fatal error:', e)
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
