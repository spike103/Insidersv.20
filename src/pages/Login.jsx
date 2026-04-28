import React, { useState } from 'react'
import { useAuthContext } from '../lib/AuthContext.jsx'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icon.jsx'
import Signup from './Signup.jsx'

export default function Login() {
  const auth = useAuthContext()
  const [mode, setMode] = useState('landing') // landing | signin | magic | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await auth.login(email.trim().toLowerCase(), password)
    setBusy(false)
    if (!res?.ok) setError(res?.error || 'Connexion impossible')
  }

  const submitMagic = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await auth.loginWithMagicLink(email.trim().toLowerCase())
    setBusy(false)
    if (!res?.ok) {
      setError(res?.error || 'Erreur')
    } else {
      setMagicSent(true)
    }
  }

  if (mode === 'signup') return <Signup onCancel={() => setMode('landing')} />

  if (mode === 'landing') {
    return (
      <div className="min-h-screen court-bg flex flex-col safe-top safe-bottom">
        <div className="flex-1 flex flex-col px-6 pt-14 pb-8">
          <div className="mb-12">
            <Logo size={40} withText={false} />
          </div>

          <div className="mb-8">
            <h1 className="display" style={{ fontSize: 38, lineHeight: 1.05 }}>
              <span className="accent-word">EVERY</span>{' '}
              <span style={{ color: 'white', fontStyle: 'italic' }}>BET</span>
            </h1>
            <h1 className="display" style={{ fontSize: 38, lineHeight: 1.05, color: 'white', fontStyle: 'italic' }}>
              HIDES A TRUTH.
            </h1>
            <h1 className="display" style={{ fontSize: 38, lineHeight: 1.05, color: 'white', fontStyle: 'italic', marginTop: 10 }}>
              JOIN THOSE
            </h1>
            <h1 className="display" style={{ fontSize: 38, lineHeight: 1.05, color: 'white', fontStyle: 'italic' }}>
              WHO HOLD IT.
            </h1>
          </div>

          <div className="flex-1" />

          <div className="space-y-3">
            <button onClick={() => setMode('signup')} className="btn-primary">
              Créer un compte
            </button>
            <button onClick={() => setMode('signin')} className="btn-ghost w-full">
              J'ai déjà un compte
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'magic') {
    return (
      <div className="min-h-screen court-bg flex flex-col safe-top safe-bottom">
        <div className="flex items-center px-5 pt-4 h-14">
          <button
            onClick={() => { setMode('signin'); setMagicSent(false); setError('') }}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--ink-800)', border: 'none', cursor: 'pointer' }}
          >
            <Icon name="chevron_left" size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col px-6 pt-6 pb-8">
          <h1 className="display mb-2" style={{ fontSize: 28 }}>
            <span className="accent-word">CONNEXION</span>{' '}
            <span style={{ color: 'white', fontStyle: 'italic' }}>SANS</span>
            <br />
            <span style={{ color: 'white', fontStyle: 'italic' }}>MOT DE PASSE.</span>
          </h1>
          <p className="body mb-6" style={{ color: 'var(--fg-2)' }}>
            On t'envoie un lien magique par email. Un clic et t'es connecté.
          </p>

          {!magicSent ? (
            <form onSubmit={submitMagic} className="space-y-3">
              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="ton@email.com"
                  autoFocus
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              {error && (
                <div className="caption" style={{ color: 'var(--loss-400)' }}>{error}</div>
              )}

              <button type="submit" disabled={!email.trim() || busy} className="btn-primary">
                {busy ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>
          ) : (
            <div className="card p-5" style={{
              background: 'rgba(34,197,94,0.08)',
              borderColor: 'rgba(34,197,94,0.4)',
            }}>
              <div className="h3 mb-2" style={{ color: 'var(--win-500)' }}>
                Email envoyé ✓
              </div>
              <p className="body" style={{ fontSize: 13 }}>
                Vérifie ta boîte <b style={{ color: 'var(--fg-1)' }}>{email}</b> et clique sur le lien magique pour te connecter.
              </p>
              <p className="caption mt-3" style={{ fontSize: 11 }}>
                Pense à regarder dans tes spams si tu ne le vois pas dans 1-2 min.
              </p>
            </div>
          )}

          <div className="flex-1" />
        </div>
      </div>
    )
  }

  // mode signin
  return (
    <div className="min-h-screen court-bg flex flex-col safe-top safe-bottom">
      <div className="flex items-center px-5 pt-4 h-14">
        <button
          onClick={() => setMode('landing')}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--ink-800)', border: 'none', cursor: 'pointer' }}
        >
          <Icon name="chevron_left" size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-6 pb-8">
        <div className="mb-8">
          <Logo size={32} withText={false} />
        </div>

        <h1 className="display mb-2" style={{ fontSize: 30 }}>
          <span className="accent-word">RAVI</span>{' '}
          <span style={{ color: 'white', fontStyle: 'italic' }}>DE TE</span>
          <br />
          <span style={{ color: 'white', fontStyle: 'italic' }}>RETROUVER.</span>
        </h1>
        <p className="body mb-8" style={{ color: 'var(--fg-2)' }}>
          Connecte-toi pour accéder à tes stats.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="ton@email.com"
              autoFocus
              autoComplete="email"
              inputMode="email"
            />
          </div>
          <div>
            <label className="field-label">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="caption" style={{ color: 'var(--loss-400)' }}>{error}</div>
          )}

          <button type="submit" disabled={!email.trim() || !password || busy} className="btn-primary">
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>

          <button
            type="button"
            onClick={() => setMode('magic')}
            className="btn-ghost w-full"
            style={{ fontSize: 13 }}
          >
            Recevoir un lien magique par email
          </button>
        </form>

        <div className="flex-1" />

        <div className="text-center body">
          Pas encore de compte ?{' '}
          <button
            type="button"
            onClick={() => setMode('signup')}
            style={{ color: 'var(--blue-500)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700 }}
          >
            Créer un compte
          </button>
        </div>
      </div>
    </div>
  )
}
