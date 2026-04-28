import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon.jsx'
import Avatar from './Avatar.jsx'
import { useApp } from '../contexts/AppContext.jsx'

// Routes considérées comme "communautaires"
// Quand on est sur l'une d'elles, la pill TopBar dit COMMUNAUTÉ et bascule vers /
// Sinon (pages perso : Home, Stats, Mes paris, Tennis...) elle dit INSIDERS et bascule vers /community
const COMMUNITY_ROUTES = ['/community', '/friends', '/leaderboard', '/challenges', '/picks', '/battles', '/profile']

function isCommunityRoute(pathname) {
  return COMMUNITY_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
}

export default function TopBar({ title, showBack = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { coins, notifications, user } = useApp()
  const hasNotif = notifications && notifications.length > 0

  const inCommunity = isCommunityRoute(location.pathname)
  const pillLabel = inCommunity ? 'INSIDERS' : 'COMMUNAUTÉ'
  const pillTarget = inCommunity ? '/' : '/community'

  return (
    <header className="sticky top-0 z-40 bg-ink-900/95 backdrop-blur-xl safe-top">
      <div className="flex items-center justify-between px-5 h-16">
        <div className="flex items-center gap-2" style={{ minWidth: 60 }}>
          {showBack ? (
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--ink-800)' }}>
              <Icon name="chevron_left" size={18} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/credits')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              className="flex items-center gap-1.5"
              aria-label="Mes crédits"
            >
              <Icon name="crown" size={22} color="gold" />
              <span style={{ fontWeight: 800, fontSize: 17 }}>{coins || 0}</span>
            </button>
          )}
        </div>

        {/* Pill contextuelle : bascule entre INSIDERS et COMMUNAUTÉ */}
        <button
          className="community-pill"
          style={{
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: '0.12em',
            padding: '10px 18px',
            fontFamily: 'Archivo Black, sans-serif',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onClick={() => navigate(pillTarget)}
          aria-label={inCommunity ? 'Retour à mon espace' : 'Aller à la communauté'}
        >
          <span>{pillLabel}</span>
          {/* Icône swap pour signaler que c'est cliquable */}
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
            <path d="M7 16h13M7 16l4-4M7 16l4 4M17 8H4M17 8l-4-4M17 8l-4 4" />
          </svg>
        </button>

        <div className="flex items-center gap-3" style={{ minWidth: 60, justifyContent: 'flex-end' }}>
          <button onClick={() => navigate('/notifications')} className="w-9 h-9 flex items-center justify-center relative" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Icon name={hasNotif ? 'bell-notification' : 'bell'} size={22} />
          </button>
          <button
            onClick={() => navigate('/settings')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            aria-label="Profil"
          >
            <Avatar
              avatarKey={user?.avatarKey}
              initials={(user?.firstName || user?.username || '?').slice(0,1).toUpperCase() + (user?.lastName || '').slice(0,1).toUpperCase()}
              color="#2962ff"
              size={32}
              fontSize={12}
            />
          </button>
        </div>
      </div>
      {title && (
        <div className="px-5 pb-3">
          <h1 className="h1">{title}</h1>
        </div>
      )}
    </header>
  )
}
