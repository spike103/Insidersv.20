-- ============================================================
-- INSIDERS — Cron job pour auto-settle des paris tennis pending
-- ============================================================
--
-- À exécuter UNE SEULE FOIS dans le SQL Editor de Supabase, après avoir :
-- 1. Déployé l'edge function auto_settle_bets
-- 2. Activé pg_cron + pg_net dans Database → Extensions
--
-- Le cron tournera toutes les 5 minutes et appellera l'edge function.
-- L'edge function elle-même ne fait rien si aucun bet pending → coût quasi-nul.

-- 1. Récupérer le project ref Supabase pour construire l'URL de l'edge function
-- L'URL est de la forme : https://<project-ref>.supabase.co/functions/v1/auto_settle_bets
--
-- IMPORTANT : remplace <PROJECT_REF> ci-dessous par TA valeur (ex: sarhwtepkylyryaahypj)
-- IMPORTANT : remplace <ANON_KEY> ci-dessous par ta vraie anon key (eyJ...)

select cron.schedule(
  'auto-settle-bets-every-5-min',  -- nom unique du job
  '*/5 * * * *',                    -- toutes les 5 minutes
  $$
  select net.http_post(
    url := 'https://sarhwtepkylyryaahypj.supabase.co/functions/v1/auto_settle_bets',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhcmh3dGVwa3lseXJ5YWFoeXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQ1NTUsImV4cCI6MjA5MjI2MDU1NX0.mX-mW4_E2DLLlIE01OvToIwCYBpzBVceHRs-uqHpaDc'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================
-- COMMANDES UTILES
-- ============================================================

-- Voir tous les jobs cron actifs
-- select * from cron.job;

-- Voir les dernières exécutions et leur statut
-- select * from cron.job_run_details order by start_time desc limit 20;

-- Désactiver temporairement le job (sans le supprimer)
-- select cron.unschedule('auto-settle-bets-every-5-min');

-- Vérifier que pg_net renvoie bien des réponses
-- select * from net._http_response order by created desc limit 10;
