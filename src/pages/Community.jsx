import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import { supabase } from '../lib/supabase.js'

// ============================================================
// PAGE COMMUNAUTÉ — hub central des features sociales
// Composé de :
//  - Hero du challenge actif (s'il y en a un)
//  - Grid 2x2 : Amis, Classement, Picks, Battles
//  - Lien "Tous les challenges" en bas
// Chaque card affiche un compteur live (nb amis, mon rang, etc.)
// ============================================================
export default function Community() {
  const navigate = useNavigate()
  const { user, bets, friends } = useApp()
  const [challenge, setChallenge] = useState(null)
  const [stats, setStats] = useState({
    pendingRequests: 0,
    myRank: null,
    myRoi: null,
    activePicks: 0,
    activeBattles: 0,
  })

  // Charge le challenge actif principal + stats des autres pages
  useEffect(() => {
    if (!user?.id) return

    const load = async () => {
      // 1. Challenge actif principal
      const { data: ch } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active')
        .order('ends_at', { ascending: true })
        .limit(1)
      if (ch && ch.length > 0) setChallenge(ch[0])

      // 2. Demandes d'amis en attente
      const { count: pendingReq } = await supabase
        .from('friend_requests')
        .select('id', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .eq('status', 'pending')

      // 3. Mon rang dans le leaderboard global
      const { data: leaderboard } = await supabase
        .from('v_leaderboard')
        .select('id, roi')
        .order('roi', { ascending: false })
        .limit(50)
      let myRank = null
      let myRoi = null
      if (leaderboard) {
        const idx = leaderboard.findIndex(r => r.id === user.id)
        if (idx >= 0) {
          myRank = idx + 1
          myRoi = Number(leaderboard[idx].roi) || 0
        }
      }

      // 4. Mes picks publiés actifs
      const { count: picksCount } = await supabase
        .from('published_bets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending')

      // 5. Mes battles actives
      const { count: battlesCount } = await supabase
        .from('battles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')

      setStats({
        pendingRequests: pendingReq || 0,
        myRank,
        myRoi,
        activePicks: picksCount || 0,
        activeBattles: battlesCount || 0,
      })
    }
    load()
  }, [user?.id])

  if (!user) return null

  return (
    <>
      <TopBar />
      <div className="px-5 pt-2 pb-28">

        {/* Header de la page Communauté */}
        <div className="mb-5">
          <div className="micro" style={{
            color: 'var(--blue-500)',
            fontWeight: 800,
            letterSpacing: '0.18em',
            marginBottom: 4,
          }}>
            ESPACE COMMUNAUTAIRE
          </div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 900,
            fontFamily: 'Archivo Black, sans-serif',
            fontStyle: 'italic',
            lineHeight: 1.05,
            color: 'white',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
          }}>
            Communauté
          </h1>
        </div>

        {/* HERO CHALLENGE ACTIF */}
        {challenge && <ChallengeHero challenge={challenge} onClick={() => navigate('/challenges')} />}

        {/* GRID 2x2 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <SectionCard
            title="Amis"
            icon="incognito"
            primary={`${friends?.length || 0}`}
            primaryLabel={`ami${(friends?.length || 0) > 1 ? 's' : ''}`}
            sub={stats.pendingRequests > 0 ? `${stats.pendingRequests} demande${stats.pendingRequests > 1 ? 's' : ''}` : 'Aucune demande'}
            badge={stats.pendingRequests > 0}
            onClick={() => navigate('/friends')}
          />
          <SectionCard
            title="Classement"
            icon="crown"
            primary={stats.myRank ? `${stats.myRank}${stats.myRank === 1 ? 'er' : 'e'}` : '—'}
            primaryLabel={stats.myRank ? 'Ton rang' : 'Non classé'}
            sub={stats.myRoi != null ? `ROI ${stats.myRoi >= 0 ? '+' : ''}${stats.myRoi.toFixed(1)}%` : 'Joue plus pour entrer dans le classement'}
            subColor={stats.myRoi != null ? (stats.myRoi >= 0 ? 'var(--win-500)' : 'var(--loss-500)') : null}
            onClick={() => navigate('/leaderboard')}
          />
          <SectionCard
            title="Picks"
            icon="share"
            primary={`${stats.activePicks}`}
            primaryLabel={`pick${stats.activePicks > 1 ? 's' : ''}`}
            sub="Publie tes paris au mur communautaire"
            onClick={() => navigate('/picks')}
          />
          <SectionCard
            title="Battles"
            icon="trending_up"
            primary={`${stats.activeBattles}`}
            primaryLabel={`en cours`}
            sub="Défie un ami sur la semaine"
            onClick={() => navigate('/battles')}
          />
        </div>

        {/* Lien tous les challenges */}
        <button
          onClick={() => navigate('/challenges')}
          className="card w-full p-4"
          style={{
            cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(240,200,90,0.12) 0%, rgba(240,200,90,0.04) 100%)',
            border: '1px solid rgba(240,200,90,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(240,200,90,0.15)',
            border: '1px solid rgba(240,200,90,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="sparkle" size={18} color="gold" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold-400)' }}>
              Tous les challenges
            </div>
            <div className="caption" style={{ fontSize: 11 }}>
              Voir tous les challenges et leur classement
            </div>
          </div>
          <Icon name="chevron_right" size={16} color="muted" />
        </button>
      </div>
    </>
  )
}

// ============================================================
// HERO du challenge actif (style Omada adapté DS Insiders)
// Pill temporelle + titre Archivo Black + stats inline + CTA
// ============================================================
function ChallengeHero({ challenge, onClick }) {
  const endTime = new Date(challenge.ends_at).getTime()
  const remaining = Math.max(0, endTime - Date.now())
  const days = Math.floor(remaining / (24 * 3600 * 1000))
  const hours = Math.floor((remaining % (24 * 3600 * 1000)) / (3600 * 1000))
  const remainingLabel = days > 0
    ? `${days} JOUR${days > 1 ? 'S' : ''} RESTANT${days > 1 ? 'S' : ''}`
    : `${hours}H RESTANTES`

  const topReward = challenge.rewards?.['1'] || 0

  return (
    <button
      onClick={onClick}
      className="card mb-5 w-full text-left"
      style={{
        padding: '22px 20px',
        background: 'linear-gradient(135deg, rgba(41,98,255,0.22) 0%, rgba(41,98,255,0.05) 100%)',
        border: '1.5px solid rgba(41,98,255,0.45)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Halo bleu décoratif */}
      <div style={{
        position: 'absolute', top: -60, right: -60,
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(41,98,255,0.3), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Illustration trophée SVG en filigrane */}
      <div style={{
        position: 'absolute', top: -10, right: -10,
        width: 130, height: 130,
        opacity: 0.18,
        pointerEvents: 'none',
      }}>
        <svg viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Coupe / trophée stylisé */}
          <path d="M30 20 H70 V35 Q70 55, 50 60 Q30 55, 30 35 Z" />
          <path d="M30 27 Q15 27, 15 38 Q15 47, 30 50" />
          <path d="M70 27 Q85 27, 85 38 Q85 47, 70 50" />
          <line x1="50" y1="60" x2="50" y2="75" />
          <path d="M40 75 H60 V82 H40 Z" />
          <path d="M35 88 H65" />
          {/* Étoile centrale */}
          <path d="M50 32 l3 6 l6 1 l-4 4 l1 6 l-6 -3 l-6 3 l1 -6 l-4 -4 l6 -1 z" />
        </svg>
      </div>

      {/* Pill temporelle */}
      <div style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 999,
        background: 'rgba(41,98,255,0.25)',
        border: '1px solid rgba(41,98,255,0.5)',
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: '0.12em',
        color: '#5b83ff',
        fontFamily: 'Archivo Black, sans-serif',
        marginBottom: 12,
        position: 'relative',
      }}>
        {remainingLabel}
      </div>

      {/* Titre */}
      <h2 style={{
        fontSize: 26,
        fontWeight: 900,
        fontFamily: 'Archivo Black, sans-serif',
        fontStyle: 'italic',
        lineHeight: 1.05,
        color: 'white',
        marginBottom: 8,
        textTransform: 'uppercase',
        position: 'relative',
        letterSpacing: '-0.01em',
      }}>
        {challenge.title}
      </h2>

      {challenge.description && (
        <p className="body" style={{
          fontSize: 13,
          marginBottom: 14,
          position: 'relative',
          maxWidth: '85%',
        }}>
          {challenge.description}
        </p>
      )}

      {/* Mini stats */}
      <div className="flex items-center gap-3" style={{ position: 'relative', marginBottom: 14 }}>
        <div className="flex items-center gap-1.5">
          <Icon name="crown" size={14} color="gold" />
          <span style={{
            fontSize: 13, fontWeight: 800,
            fontFamily: 'Archivo Black, sans-serif',
            color: 'var(--gold-400)',
          }}>
            +{topReward}
          </span>
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>top 1</span>
        </div>
      </div>

      {/* CTA */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center', gap: 6,
        padding: '8px 14px',
        borderRadius: 999,
        background: 'var(--blue-500)',
        color: 'white',
        fontSize: 12,
        fontWeight: 900,
        fontFamily: 'Archivo Black, sans-serif',
        letterSpacing: '0.05em',
        position: 'relative',
      }}>
        Voir le challenge
        <Icon name="chevron_right" size={12} color="white" />
      </div>
    </button>
  )
}

// ============================================================
// Card section (Amis / Classement / Picks / Battles)
// ============================================================
function SectionCard({ title, icon, primary, primaryLabel, sub, subColor, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card p-4 w-full text-left"
      style={{
        cursor: 'pointer',
        position: 'relative',
        minHeight: 130,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Badge dot de notif */}
      {badge && (
        <span style={{
          position: 'absolute',
          top: 12, right: 12,
          width: 10, height: 10,
          borderRadius: '50%',
          background: 'var(--loss-500)',
          boxShadow: '0 0 0 3px var(--ink-800)',
        }} />
      )}

      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(41,98,255,0.12)',
        border: '1px solid rgba(41,98,255,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
      }}>
        <Icon name={icon} size={18} color="blue" />
      </div>

      <div>
        <div className="micro" style={{
          color: 'var(--fg-3)',
          fontWeight: 800,
          letterSpacing: '0.12em',
          fontSize: 10,
          marginBottom: 4,
        }}>
          {title.toUpperCase()}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 4 }}>
          <span style={{
            fontSize: 26,
            fontWeight: 900,
            fontFamily: 'Archivo Black, sans-serif',
            fontStyle: 'italic',
            lineHeight: 1,
            color: 'white',
          }}>
            {primary}
          </span>
          {primaryLabel && (
            <span style={{
              fontSize: 11,
              color: 'var(--fg-3)',
              fontWeight: 600,
            }}>
              {primaryLabel}
            </span>
          )}
        </div>

        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: subColor || 'var(--fg-3)',
          lineHeight: 1.3,
        }}>
          {sub}
        </div>
      </div>
    </button>
  )
}
