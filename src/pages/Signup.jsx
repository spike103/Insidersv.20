import React, { useState } from 'react'
import { useAuthContext } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icon.jsx'

const SLIDES = ['name', 'email', 'password', 'username', 'bankroll']

export default function Signup({ onCancel }) {
  const auth = useAuthContext()
  const [slide, setSlide] = useState(0)
  const [data, setData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    username: '',
    bankrollStart: 500,
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const update = (k, v) => { setData(d => ({ ...d, [k]: v })); setError('') }

  const validateSlide = async () => {
    if (slide === 0) {
      if (!data.firstName.trim() || !data.lastName.trim()) return 'Renseigne ton prénom et ton nom'
    }
    if (slide === 1) {
      if (!data.email.trim()) return 'Renseigne un email'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return 'Email invalide'
    }
    if (slide === 2) {
      if (!data.password) return 'Choisis un mot de passe'
      if (data.password.length < 6) return 'Mot de passe trop court (min 6 caractères)'
    }
    if (slide === 3) {
      const u = data.username.trim().toLowerCase()
      if (!u) return 'Choisis un username'
      if (u.length < 3) return 'Username trop court (min 3 caractères)'
      if (!/^[a-z0-9_]+$/.test(u)) return 'Lettres minuscules, chiffres et _ uniquement'
      // Check unicité côté DB
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', u)
        .maybeSingle()
      if (existing) return 'Username déjà pris'
    }
    if (slide === 4) {
      const v = Number(data.bankrollStart)
      if (!v || v <= 0) return 'Bankroll invalide'
    }
    return null
  }

  const next = async () => {
    setBusy(true)
    const err = await validateSlide()
    if (err) { setError(err); setBusy(false); return }
    setError('')

    if (slide < SLIDES.length - 1) {
      setSlide(slide + 1)
      setBusy(false)
    } else {
      // Submit
      const res = await auth.signup({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        username: data.username.trim().toLowerCase(),
        bankrollStart: Number(data.bankrollStart),
      })
      setBusy(false)
      if (!res?.ok) {
        setError(res?.error || 'Erreur')
      } else {
        setSubmitted(true)
        // Si needsEmailConfirmation → on affiche le message "vérifie ta boîte"
        // Sinon Supabase a directement créé la session → AuthContext load le profile
      }
    }
  }

  const back = () => {
    if (slide === 0) onCancel?.()
    else setSlide(slide - 1)
  }

  if (submitted) {
    return (
      <div className="min-h-screen court-bg flex flex-col safe-top safe-bottom">
        <div className="flex-1 flex flex-col px-6 pt-14 pb-8 items-center justify-center text-center">
          <div className="display mb-3" style={{ fontSize: 32 }}>
            <span className="accent-word">BIENVENUE</span>
            <br />
            <span style={{ color: 'white', fontStyle: 'italic' }}>{data.firstName.toUpperCase()}.</span>
          </div>

          <div className="card p-5 mt-6" style={{
            maxWidth: 360,
            background: 'rgba(34,197,94,0.08)',
            borderColor: 'rgba(34,197,94,0.4)',
          }}>
            <div className="h3 mb-2" style={{ color: 'var(--win-500)' }}>
              Compte créé ✓
            </div>
            <p className="body" style={{ fontSize: 13 }}>
              On t'a envoyé un email de confirmation à <b style={{ color: 'var(--fg-1)' }}>{data.email}</b>.
              Clique sur le lien pour activer ton compte.
            </p>
            <p className="caption mt-3" style={{ fontSize: 11 }}>
              Pense à regarder dans tes spams si tu ne le vois pas dans 1-2 min.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen court-bg flex flex-col safe-top safe-bottom">
      <div className="flex items-center justify-between px-5 pt-4 h-14">
        <button
          onClick={back}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--ink-800)', border: 'none', cursor: 'pointer' }}
        >
          <Icon name="chevron_left" size={18} />
        </button>
        <span className="micro text-fg-3" style={{ fontWeight: 700 }}>{slide + 1}/{SLIDES.length}</span>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-2 pb-8">
        <div className="flex items-center gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 999,
                background: i <= slide ? 'var(--blue-500)' : 'rgba(255,255,255,0.1)',
                transition: 'background 200ms',
              }}
            />
          ))}
        </div>

        {slide === 0 && <SlideName data={data} update={update} />}
        {slide === 1 && <SlideEmail data={data} update={update} />}
        {slide === 2 && <SlidePassword data={data} update={update} />}
        {slide === 3 && <SlideUsername data={data} update={update} />}
        {slide === 4 && <SlideBankroll data={data} update={update} />}

        {error && (
          <div className="caption mt-4" style={{ color: 'var(--loss-400)' }}>{error}</div>
        )}

        <div className="flex-1" />

        <button onClick={next} disabled={busy} className="btn-primary">
          {busy ? '…' : (slide === SLIDES.length - 1 ? 'Créer mon compte' : 'Continuer')}
        </button>
      </div>
    </div>
  )
}

function SlideName({ data, update }) {
  return (
    <>
      <h1 className="display mb-2" style={{ fontSize: 28, lineHeight: 1.1 }}>
        <span className="accent-word">COMMENT</span>{' '}
        <span style={{ color: 'white', fontStyle: 'italic' }}>TU</span>
        <br />
        <span style={{ color: 'white', fontStyle: 'italic' }}>T'APPELLES&nbsp;?</span>
      </h1>
      <p className="body mb-6" style={{ color: 'var(--fg-2)' }}>
        On utilisera ton prénom dans tes récaps et insights personnalisés.
      </p>

      <div className="space-y-3">
        <div>
          <label className="field-label">Prénom</label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            placeholder="Carlos"
            autoFocus
            autoComplete="given-name"
          />
        </div>
        <div>
          <label className="field-label">Nom</label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            placeholder="Alcaraz"
            autoComplete="family-name"
          />
        </div>
      </div>
    </>
  )
}

function SlideEmail({ data, update }) {
  return (
    <>
      <h1 className="display mb-2" style={{ fontSize: 28, lineHeight: 1.1 }}>
        <span className="accent-word">TON</span>{' '}
        <span style={{ color: 'white', fontStyle: 'italic' }}>EMAIL.</span>
      </h1>
      <p className="body mb-6" style={{ color: 'var(--fg-2)' }}>
        Pour récupérer ton compte si tu changes de téléphone et recevoir tes récaps mensuels.
      </p>

      <div>
        <label className="field-label">Email</label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="carlos@insiders.app"
          autoFocus
          autoComplete="email"
          inputMode="email"
        />
      </div>

      <div className="caption mt-3">
        On ne partage jamais ton email avec qui que ce soit.
      </div>
    </>
  )
}

function SlidePassword({ data, update }) {
  return (
    <>
      <h1 className="display mb-2" style={{ fontSize: 28, lineHeight: 1.1 }}>
        <span className="accent-word">UN</span>{' '}
        <span style={{ color: 'white', fontStyle: 'italic' }}>MOT DE</span>
        <br />
        <span style={{ color: 'white', fontStyle: 'italic' }}>PASSE.</span>
      </h1>
      <p className="body mb-6" style={{ color: 'var(--fg-2)' }}>
        6 caractères minimum. Tu pourras aussi te connecter par lien magique sans mot de passe.
      </p>

      <div>
        <label className="field-label">Mot de passe</label>
        <input
          type="password"
          value={data.password}
          onChange={(e) => update('password', e.target.value)}
          placeholder="••••••••"
          autoFocus
          autoComplete="new-password"
        />
      </div>
    </>
  )
}

function SlideUsername({ data, update }) {
  return (
    <>
      <h1 className="display mb-2" style={{ fontSize: 28, lineHeight: 1.1 }}>
        <span className="accent-word">CHOISIS</span>{' '}
        <span style={{ color: 'white', fontStyle: 'italic' }}>TON</span>
        <br />
        <span style={{ color: 'white', fontStyle: 'italic' }}>USERNAME.</span>
      </h1>
      <p className="body mb-6" style={{ color: 'var(--fg-2)' }}>
        C'est comme ça que tes amis pourront t'ajouter et que tu apparaîtras dans le classement.
      </p>

      <div>
        <label className="field-label">Username</label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--fg-3)', fontWeight: 700, fontSize: 14,
          }}>@</span>
          <input
            type="text"
            value={data.username}
            onChange={(e) => update('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="carlitos"
            autoFocus
            autoCapitalize="none"
            autoComplete="username"
            style={{ paddingLeft: 30, fontWeight: 600 }}
            maxLength={20}
          />
        </div>
      </div>

      <div className="caption mt-3">
        Lettres minuscules, chiffres et underscore. 3 caractères minimum.
      </div>
    </>
  )
}

function SlideBankroll({ data, update }) {
  const presets = [100, 500, 1000, 5000]
  return (
    <>
      <h1 className="display mb-2" style={{ fontSize: 28, lineHeight: 1.1 }}>
        <span className="accent-word">TA</span>{' '}
        <span style={{ color: 'white', fontStyle: 'italic' }}>BANKROLL</span>
        <br />
        <span style={{ color: 'white', fontStyle: 'italic' }}>DE DÉPART.</span>
      </h1>
      <p className="body mb-6" style={{ color: 'var(--fg-2)' }}>
        On l'utilise pour calculer ton ROI et tes objectifs. Tu pourras la changer plus tard.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => update('bankrollStart', p)}
            className="card"
            style={{
              padding: 14, textAlign: 'center', cursor: 'pointer',
              borderColor: Number(data.bankrollStart) === p ? 'var(--blue-500)' : 'var(--ink-600)',
              borderWidth: Number(data.bankrollStart) === p ? 1.5 : 1,
              boxShadow: Number(data.bankrollStart) === p ? 'var(--glow-blue-soft)' : 'none',
              background: Number(data.bankrollStart) === p ? 'rgba(41,98,255,0.08)' : 'transparent',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: Number(data.bankrollStart) === p ? 'var(--blue-500)' : 'var(--fg-1)' }}>
              {p}€
            </div>
          </button>
        ))}
      </div>
      <label className="field-label">Ou montant personnalisé</label>
      <input
        type="number"
        inputMode="decimal"
        value={data.bankrollStart}
        onChange={(e) => update('bankrollStart', e.target.value)}
        placeholder="500"
      />
    </>
  )
}
