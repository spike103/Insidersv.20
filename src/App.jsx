import React, { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from './contexts/AppContext.jsx'
import Login from './pages/Login.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Home from './pages/Home.jsx'
import Matchs from './pages/Matchs.jsx'
import MatchDetail from './pages/MatchDetail.jsx'
import Tennis from './pages/Tennis.jsx'
import PlayerDetail from './pages/PlayerDetail.jsx'
import TournamentDetail from './pages/TournamentDetail.jsx'
import Stats from './pages/Stats.jsx'
import AddBet from './pages/AddBet.jsx'
import Settings from './pages/Settings.jsx'
import Notifications from './pages/Notifications.jsx'
import Friends from './pages/Friends.jsx'
import Credits from './pages/Credits.jsx'
import Community from './pages/Community.jsx'
import Challenges from './pages/Challenges.jsx'
import Picks from './pages/Picks.jsx'
import Battles from './pages/Battles.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import ProfileView from './pages/ProfileView.jsx'
import BottomNav from './components/BottomNav.jsx'

export default function App() {
  const { isAuth, user, isLoading } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  const mountedRef = useRef(false)
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    if (isAuth && user?.onboardingDone) {
      navigate('/', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prevAuthRef = useRef(isAuth)
  const prevOnboardingRef = useRef(user?.onboardingDone)

  useEffect(() => {
    const wasAuth = prevAuthRef.current
    const isOnboardingDone = user?.onboardingDone
    const wasOnboardingDone = prevOnboardingRef.current

    if (!wasAuth && isAuth && isOnboardingDone) {
      navigate('/', { replace: true })
    }
    if (isAuth && !wasOnboardingDone && isOnboardingDone) {
      navigate('/', { replace: true })
    }

    prevAuthRef.current = isAuth
    prevOnboardingRef.current = isOnboardingDone
  }, [isAuth, user?.onboardingDone, navigate])

  // ÉCRAN DE CHARGEMENT pendant l'init de la session Supabase
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink-900)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="display" style={{ fontSize: 28, marginBottom: 12 }}>
            <span className="accent-word">INSIDERS</span>
          </div>
          <div className="caption" style={{ color: 'var(--fg-3)' }}>
            Chargement…
          </div>
        </div>
      </div>
    )
  }

  if (!isAuth) return <Login />
  if (!user) {
    // Auth OK mais profile pas encore chargé — éviter le flash de Login
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink-900)' }}>
        <div className="caption" style={{ color: 'var(--fg-3)' }}>Chargement de ton profil…</div>
      </div>
    )
  }
  if (!user.onboardingDone) return <Onboarding />

  const hideNav = location.pathname === '/add-bet'

  return (
    <div className="min-h-screen" style={{ background: 'var(--ink-900)' }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/matchs" element={<Matchs />} />
        <Route path="/matchs/:id" element={<MatchDetail />} />
        <Route path="/tennis" element={<Tennis />} />
        <Route path="/players" element={<Tennis />} />
        <Route path="/players/:name" element={<PlayerDetail />} />
        <Route path="/tournaments" element={<Tennis />} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/add-bet" element={<AddBet />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/community" element={<Community />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/picks" element={<Picks />} />
        <Route path="/battles" element={<Battles />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile/:username" element={<ProfileView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  )
}
