import React, { useEffect, useState } from 'react'
import Icon from './Icon.jsx'

// Modal de "pub à regarder" pour débloquer une action
// En prod : remplacer par un vrai SDK rewarded video (AdMob/AdSense)
// Pour le MVP : compte à rebours 5s + bouton de complétion
export default function AdModal({ open, action, onClose, onReward, label }) {
  const [countdown, setCountdown] = useState(5)
  const [skippable, setSkippable] = useState(false)

  useEffect(() => {
    if (!open) {
      setCountdown(5)
      setSkippable(false)
      return
    }
    if (countdown <= 0) {
      setSkippable(true)
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [open, countdown])

  if (!open) return null

  const handleClaim = () => {
    onReward?.(action)
    onClose?.()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="card relative w-full max-w-sm animate-slide-up"
        style={{ padding: 22, textAlign: 'center', overflow: 'hidden' }}
      >
        {/* Mock ad visual : un faux placement */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1c3370, #0a1a40)',
            borderRadius: 14,
            padding: '36px 16px',
            marginBottom: 16,
            border: '1px solid var(--ink-600)',
          }}
        >
          <div className="micro" style={{ color: 'var(--fg-3)', letterSpacing: '0.2em', marginBottom: 8 }}>
            ANNONCE
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 4 }}>
            🎾 Insiders Premium
          </div>
          <div className="caption" style={{ fontSize: 12 }}>
            Paris illimités, analyses avancées, sans publicité.
          </div>
          <div style={{
            marginTop: 14, padding: '8px 14px',
            background: 'rgba(41,98,255,0.15)',
            borderRadius: 999,
            display: 'inline-block',
            fontSize: 11, fontWeight: 700,
            color: 'var(--blue-500)',
          }}>
            En savoir plus →
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="h3 mb-1">Regarde cette annonce</div>
          <div className="caption">Pour débloquer : <b style={{ color: 'var(--fg-1)' }}>{label}</b></div>
        </div>

        {!skippable ? (
          <div style={{
            padding: '12px',
            background: 'var(--ink-800)',
            borderRadius: 10,
            fontSize: 14, fontWeight: 600,
            color: 'var(--fg-2)',
          }}>
            Patiente <b style={{ color: 'var(--blue-500)' }}>{countdown}s</b>…
          </div>
        ) : (
          <div className="space-y-2">
            <button onClick={handleClaim} className="btn-primary">
              <Icon name="check" size={14} color="white" strokeWidth={3} />
              Récupérer ma récompense
            </button>
            <button onClick={onClose} className="btn-ghost w-full" style={{ fontSize: 12 }}>
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
