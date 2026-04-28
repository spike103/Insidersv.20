# 🚀 Phase B2 — Déploiement de l'auto-settle

Cette doc te guide pour activer l'auto-règlement des paris tennis.

## ⚙️ Prérequis (déjà fait)

- ✅ Compte RapidAPI + subscription TennisApi
- ✅ Secrets Supabase : `RAPIDAPI_KEY` + `RAPIDAPI_HOST`
- ✅ Extensions Postgres activées : `pg_cron` + `pg_net`

## 📋 Étape 1 — Déployer l'Edge Function

L'Edge Function est dans `supabase/functions/auto_settle_bets/index.ts`. On la déploie via le dashboard Supabase (pas besoin de CLI).

### Via le dashboard Supabase (recommandé pour toi)

1. Va sur **supabase.com** → ton projet → sidebar **Edge Functions** ⚡
2. Clique **"Deploy a new function"** (ou **"Create function"**)
3. Donne le nom : `auto_settle_bets` (exactement ce nom — important pour le cron)
4. **Copie-colle TOUT le contenu** du fichier `supabase/functions/auto_settle_bets/index.ts` dans l'éditeur web qui s'ouvre
5. Clique **"Deploy function"**
6. Attends ~30 secondes que ça build et déploie

### Vérifier que ça marche

1. Dans l'écran de la function, en haut tu vois **"Test function"** ou **"Invoke"**
2. Clique-le, laisse le body vide (`{}`)
3. La réponse devrait être :
   ```json
   { "ok": true, "message": "No pending bets", "processed": 0, "settled": 0 }
   ```

Si tu vois ça : **🎉 ta function est en ligne**.

Si tu vois une erreur 500 :
- Vérifie que `RAPIDAPI_KEY` et `RAPIDAPI_HOST` sont bien stockés dans Edge Functions → Secrets
- Vérifie les logs : Edge Functions → ta function → onglet "Logs"
- Dis-moi le message d'erreur

## 📋 Étape 2 — Trouver ton URL de fonction

1. Toujours dans Edge Functions → ta fonction `auto_settle_bets`
2. Tu vois une section **"Endpoint URL"** (ou similaire) qui ressemble à :
   ```
   https://sarhwtepkylyryaahypj.supabase.co/functions/v1/auto_settle_bets
   ```
3. **Copie cette URL exactement.**

## 📋 Étape 3 — Programmer le cron job

Maintenant on dit à Postgres "appelle cette URL toutes les 5 minutes".

1. Sur Supabase → **SQL Editor** → New query
2. Ouvre le fichier `supabase/sql/cron_auto_settle.sql`
3. **Modifie** les 2 valeurs dans le SQL :
   - Remplace `https://sarhwtepkylyryaahypj.supabase.co/...` par TON URL d'edge function (étape 2)
   - Remplace la chaîne `Bearer eyJ...` par `Bearer <TA_ANON_KEY>` (la même anon key que dans Netlify env vars)
4. Colle-le dans le SQL Editor et **Run**
5. Tu dois voir "Success. No rows returned" (pg_cron renvoie juste un job_id)

### Vérifier que le cron tourne

Dans le SQL Editor, lance :

```sql
select * from cron.job;
```

Tu dois voir 1 ligne avec ton job `auto-settle-bets-every-5-min`, schedule `*/5 * * * *`, active = `true`.

Pour voir les exécutions :

```sql
select jobname, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 10;
```

Au bout de 5 minutes maxi, tu dois voir une première exécution avec `status = 'succeeded'`.

## 📋 Étape 4 — Test end-to-end

1. Dans l'app Insiders, **crée un pari tennis simple** sur un match qui a déjà eu lieu hier (ex: Alcaraz vs Sinner sur le tournoi de samedi dernier)
2. **Attends 5-10 minutes**
3. Recharge l'app — le pari devrait apparaître comme "Gagné" ou "Perdu" automatiquement
4. Dans Supabase SQL Editor, vérifie :
   ```sql
   select id, status, stake, odd, bet_date from bets order by created_at desc limit 5;
   ```
   Le status est passé de `pending` à `won`/`lost`

## 🐛 Si ça marche pas

**Le bet reste pending même après 10 min :**
- Lance dans SQL Editor : `select * from cron.job_run_details order by start_time desc limit 5;` → regarde `return_message`
- Si "200" → l'edge function tourne mais ne trouve pas le match. Logs Edge Functions → console.log
- Si "401/403" → ton authorization header dans le SQL cron est faux. Re-vérifie l'anon key.
- Si "404" → l'URL de l'edge function est fausse. Re-vérifie l'URL.

**L'edge function plante (500) :**
- Edge Functions → ta function → onglet **Logs** → cherche les erreurs récentes
- Causes typiques :
  - `RAPIDAPI_KEY` non défini dans Secrets
  - Réponse API tennis dans un format inattendu (les providers changent souvent leur structure JSON)
  - Quota RapidAPI dépassé

## 💰 Suivi de coût

- **RapidAPI** : 500 req/mois sur le plan BASIC. Le cron tourne 8 640 fois/mois mais ne fait des req API QUE si bets pending. Avec 10 paris pending, tu fais ~50 req/mois. Très loin du quota.
- **Edge Function** : 500K invocations gratuites/mois. Le cron en consomme 8 640. Très loin du quota.
- **pg_cron + pg_net** : gratuit, illimité.

## ⚠️ Limitations actuelles (à améliorer en B3)

L'edge function gère **tennis simple uniquement** pour l'instant. Elle skip :
- Les combinés (mode `combine`)
- Les paris live (`mode = 'live'`) — leur résultat dépend du moment où tu l'as pris
- Les sports non-tennis (foot, basket) — pas couverts par TennisApi
- Les paris custom (handicap sets, total games, score exact) — gérés par l'API mais pas notre matching

On améliorera tout ça progressivement.
