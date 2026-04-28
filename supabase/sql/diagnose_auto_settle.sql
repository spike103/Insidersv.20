-- ============================================================
-- INSIDERS — Diagnostic auto-settle (B2)
-- ============================================================
-- À runner dans Supabase SQL Editor pour comprendre pourquoi
-- l'auto-settle ne marche pas.

-- 1. Le cron job est-il bien programmé ?
select jobid, jobname, schedule, active
from cron.job
where jobname like '%settle%' or jobname like '%bet%';
-- → Tu dois voir 1 ligne avec active = true et schedule = '*/5 * * * *'
-- Si rien → cron pas créé, faut le re-créer

-- 2. Les exécutions récentes ont-elles réussi ?
select jobname, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 10;
-- → Tu cherches status = 'succeeded' et return_message contenant un statut HTTP 200
-- Si status = 'failed' → l'edge function plante, regarde return_message
-- Si pas de lignes du tout → cron pas exécuté

-- 3. L'edge function reçoit-elle les requêtes ?
select status_code, content::text, created
from net._http_response
order by created desc
limit 5;
-- → Tu dois voir status_code = 200 (success)
-- Si 401/403 → ton anon key dans le SQL cron est mauvaise
-- Si 404 → l'URL de l'edge function est mauvaise
-- Si 500 → l'edge function plante (regarder logs Supabase)

-- 4. As-tu des bets en pending tennis simple ?
select id, status, sport, mode, bet_date, data->'players' as players
from public.bets
where status = 'pending' and sport = 'tennis' and mode = 'simple'
order by bet_date desc
limit 10;
-- → Tu dois voir au moins 1 ligne pour que l'edge function ait du grain à moudre
-- Si vide, normal que rien ne se passe

-- 5. Des bets ont-ils été settled récemment par auto ?
select id, status, bet_date,
       data->'players' as players,
       created_at
from public.bets
where status in ('won', 'lost')
order by created_at desc
limit 5;
