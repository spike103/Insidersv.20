import React, { useState } from 'react'
import { useApp } from '../contexts/AppContext.jsx'
import Icon from '../components/Icon.jsx'

const SLIDES = [
  {
    verb: 'AJOUTE',
    rest: 'tes paris en quelques secondes',
    body: "Tennis principalement, et même tes combinés foot ou basket. ML, sets, totaux, handicaps — on gère tout.",
    illus: 'add',
  },
  {
    verb: 'DÉCOUVRE',
    rest: 'tes patterns cachés',
    body: "Surface qui te réussit, types de paris à éviter, rythme et stake variance. On te révèle ce que tu n'avais jamais remarqué.",
    illus: 'insights',
  },
  {
    verb: 'RIVALISE',
    rest: 'avec tes amis',
    body: "Ajoute tes potes, regarde leurs stats, compare vos ROI. Si t'es bon, monte dans le classement mondial.",
    illus: 'social',
  },
  {
    verb: 'BASCULE',
    rest: 'entre tes deux mondes',
    body: "Touche INSIDERS en haut de l'écran pour passer côté communauté : amis, classement, challenges hebdo, picks publiés et battles 1v1.",
    illus: 'toggle',
  },
  {
    verb: 'PARTAGE',
    rest: 'tes meilleurs récaps',
    body: "Génère des cartes Insiders à partager sur les réseaux. Tes stats deviennent ta marque.",
    illus: 'share',
  },
]

export default function Onboarding() {
  const { setOnboardingDone, user } = useApp()
  const [slide, setSlide] = useState(0)
  const next = () => {
    if (slide < SLIDES.length - 1) setSlide(slide + 1)
    else setOnboardingDone()
  }
  const skip = () => setOnboardingDone()
  const current = SLIDES[slide]

  return (
    <div className="min-h-screen court-bg flex flex-col safe-top safe-bottom">
      <div className="flex items-center justify-between px-5 pt-4 h-14">
        <button
          onClick={() => slide > 0 && setSlide(slide - 1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--ink-800)', opacity: slide > 0 ? 1 : 0, pointerEvents: slide > 0 ? 'auto' : 'none', border: 'none', cursor: 'pointer' }}
        >
          <Icon name="chevron_left" size={18} />
        </button>
        <span className="micro text-fg-1" style={{ fontWeight: 800 }}>{slide + 1}/{SLIDES.length}</span>
        <button
          onClick={skip}
          className="micro"
          style={{ color: 'var(--fg-3)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', visibility: slide < SLIDES.length - 1 ? 'visible' : 'hidden' }}
        >
          Passer
        </button>
      </div>

      <div className="flex-1 flex flex-col px-5">
        {/* Texte EN HAUT */}
        {slide === 0 && user?.firstName && (
          <div className="caption mb-3" style={{ color: 'var(--blue-500)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Bienvenue {user.firstName}
          </div>
        )}

        <h1 className="display" style={{ fontSize: 34, lineHeight: 1.05, marginBottom: 14 }}>
          <span className="accent-word">{current.verb}</span>{' '}
          <span style={{ color: 'white', fontStyle: 'italic' }}>{current.rest}</span>
        </h1>
        <p className="body" style={{ color: 'var(--fg-2)', marginBottom: 24, fontSize: 15 }}>
          {current.body}
        </p>

        {/* Illustration EN DESSOUS */}
        <div style={{
          flex: '0 0 auto',
          aspectRatio: '4 / 3',
          maxHeight: '42vh',
          width: '100%',
          marginTop: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {current.illus === 'add' && <IllusAdd />}
          {current.illus === 'insights' && <IllusInsights />}
          {current.illus === 'social' && <IllusSocial />}
          {current.illus === 'toggle' && <IllusToggle />}
          {current.illus === 'share' && <IllusShare />}
        </div>
      </div>

      <div className="px-5 pb-8 pt-2 space-y-3">
        <div className="flex items-center justify-center gap-2 mb-3">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === slide ? 32 : 8, height: 6,
                background: i === slide ? 'var(--blue-500)' : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </div>
        <button onClick={next} className="btn-primary">
          {slide === SLIDES.length - 1 ? "C'est parti" : 'Continuer'}
        </button>
      </div>
    </div>
  )
}

// ============ ILLUSTRATIONS — PLUS GRANDES & PLUS NETTES ============

function IllusAdd() {
  return (
    <svg viewBox="0 0 360 280" width="100%" height="100%" style={{ maxWidth: 460 }}>
      <defs>
        <linearGradient id="addGlow" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#2962ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#2962ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* glow background */}
      <circle cx="290" cy="220" r="120" fill="url(#addGlow)" />

      {/* Card 1 — gros, en haut à gauche */}
      <g transform="translate(20, 30)">
        <rect width="240" height="86" rx="18" fill="var(--ink-800)" stroke="var(--ink-600)" strokeWidth="1.5" />
        <rect x="14" y="14" width="48" height="20" rx="10" fill="rgba(34,197,94,0.18)" stroke="rgba(34,197,94,0.5)" />
        <text x="38" y="27" textAnchor="middle" fontSize="9" fontWeight="900" fill="#22c55e" letterSpacing="1" fontFamily="Archivo Black">WON</text>
        <text x="14" y="58" fontSize="18" fontWeight="800" fill="white" fontFamily="Plus Jakarta Sans">Alcaraz vs. Sinner</text>
        <text x="14" y="74" fontSize="11" fill="var(--fg-3)" fontWeight="600" fontFamily="Plus Jakarta Sans">Roland-Garros · F</text>
        <text x="226" y="58" textAnchor="end" fontSize="20" fontWeight="900" fill="#22c55e" fontFamily="Archivo Black">+42€</text>
      </g>

      {/* Card 2 — combo */}
      <g transform="translate(80, 140)">
        <rect width="240" height="86" rx="18" fill="var(--ink-800)" stroke="var(--blue-500)" strokeWidth="1.5" />
        <rect x="14" y="14" width="62" height="20" rx="10" fill="rgba(41,98,255,0.2)" stroke="rgba(41,98,255,0.6)" />
        <text x="45" y="27" textAnchor="middle" fontSize="9" fontWeight="900" fill="#5b83ff" letterSpacing="1" fontFamily="Archivo Black">COMBO</text>
        <text x="14" y="58" fontSize="18" fontWeight="800" fill="white" fontFamily="Plus Jakarta Sans">PSG · Real · Lakers</text>
        <text x="14" y="74" fontSize="11" fill="var(--fg-3)" fontWeight="600" fontFamily="Plus Jakarta Sans">3 matchs combinés</text>
      </g>

      {/* + bouton bleu lumineux */}
      <g transform="translate(310, 230)">
        <circle r="40" fill="#2962ff" opacity="0.25" />
        <circle r="28" fill="#2962ff" opacity="0.45" />
        <circle r="22" fill="#2962ff" />
        <path d="M -10 0 L 10 0 M 0 -10 L 0 10" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function IllusInsights() {
  return (
    <svg viewBox="0 0 360 280" width="100%" height="100%" style={{ maxWidth: 460 }}>
      <defs>
        <linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* big chart card */}
      <g transform="translate(20, 20)">
        <rect width="320" height="170" rx="20" fill="var(--ink-800)" stroke="var(--ink-600)" strokeWidth="1.5" />
        <text x="20" y="32" fontSize="11" fontWeight="900" fill="var(--fg-3)" letterSpacing="2.5" fontFamily="Archivo Black">BANKROLL</text>
        <text x="20" y="62" fontSize="32" fontWeight="900" fill="white" fontFamily="Archivo Black">1 254€</text>
        <text x="20" y="82" fontSize="13" fontWeight="900" fill="#22c55e" fontFamily="Archivo Black">+25.4%</text>

        {/* curve */}
        <path d="M 20 150 L 70 142 L 120 147 L 170 118 L 220 130 L 270 95 L 300 105"
          stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 20 150 L 70 142 L 120 147 L 170 118 L 220 130 L 270 95 L 300 105 L 300 160 L 20 160 Z"
          fill="url(#curveFill)" />

        {/* peak point */}
        <circle cx="270" cy="95" r="6" fill="#22c55e" stroke="var(--ink-900)" strokeWidth="2" />
        <circle cx="270" cy="95" r="11" fill="#22c55e" opacity="0.3" />
        {/* low point */}
        <circle cx="120" cy="147" r="4" fill="#ef4444" stroke="var(--ink-900)" strokeWidth="2" />
      </g>

      {/* Insight pill below */}
      <g transform="translate(40, 210)">
        <rect width="280" height="54" rx="14" fill="rgba(240,224,128,0.12)" stroke="rgba(240,224,128,0.5)" strokeWidth="1.5" />
        <circle cx="28" cy="27" r="11" fill="#f0e080" />
        <path d="M 24 27 L 27 30 L 33 23" stroke="#1a0f00" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="50" y="22" fontSize="10" fontWeight="900" fill="#f0e080" letterSpacing="2" fontFamily="Archivo Black">INSIGHT</text>
        <text x="50" y="40" fontSize="13" fontWeight="800" fill="white" fontFamily="Plus Jakarta Sans">3× meilleur sur terre que sur dur</text>
      </g>
    </svg>
  )
}

function IllusSocial() {
  const rows = [
    { y: 20, rank: '1', name: 'spike', roi: '+34.2%', color: '#f0e080', bg: 'rgba(240,224,128,0.08)' },
    { y: 80, rank: '2', name: 'tennistar', roi: '+28.5%', color: 'var(--fg-2)', bg: 'var(--ink-800)' },
    { y: 140, rank: '3', name: 'alcaraz_fan', roi: '+24.8%', color: 'var(--fg-2)', bg: 'var(--ink-800)' },
    { y: 200, rank: '7', name: 'TOI', roi: '+12.1%', color: '#5b83ff', bg: 'rgba(41,98,255,0.12)', highlight: true },
  ]

  return (
    <svg viewBox="0 0 360 280" width="100%" height="100%" style={{ maxWidth: 460 }}>
      {rows.map((row, i) => (
        <g key={i} transform={`translate(20, ${row.y})`}>
          <rect width="320" height="50" rx="14"
            fill={row.bg}
            stroke={row.highlight ? '#5b83ff' : 'var(--ink-600)'}
            strokeWidth={row.highlight ? '2' : '1'} />
          <text x="20" y="32" fontSize="20" fontWeight="900" fill={row.color} fontFamily="Archivo Black">
            #{row.rank}
          </text>
          <text x="60" y="22" fontSize="14" fontWeight="900" fill={row.highlight ? '#5b83ff' : 'white'} fontFamily="Archivo Black" style={{ fontStyle: 'italic' }}>
            @{row.name}
          </text>
          <text x="60" y="38" fontSize="10" fontWeight="700" fill="var(--fg-3)" fontFamily="Plus Jakarta Sans">
            {row.rank === '1' && 'TOP MONDIAL'}
            {row.rank === '2' && 'France'}
            {row.rank === '3' && 'Espagne'}
            {row.highlight && 'Toi'}
          </text>
          <text x="304" y="32" textAnchor="end" fontSize="16" fontWeight="900" fill="#22c55e" fontFamily="Archivo Black">
            {row.roi}
          </text>
        </g>
      ))}
    </svg>
  )
}

function IllusShare() {
  return (
    <svg viewBox="0 0 360 280" width="100%" height="100%" style={{ maxWidth: 460 }}>
      <defs>
        <linearGradient id="goldShare" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffe587" />
          <stop offset="50%" stopColor="#f0c85a" />
          <stop offset="100%" stopColor="#d4a33a" />
        </linearGradient>
      </defs>
      {/* gold card centrée, plus grande */}
      <g transform="translate(70, 15)">
        <rect width="220" height="240" rx="22" fill="url(#goldShare)" />

        {/* INSIDERS top */}
        <text x="20" y="28" fontSize="11" fontWeight="900" fill="#3d2a00" letterSpacing="2.5" fontFamily="Archivo Black">INSIDERS</text>
        <text x="200" y="28" textAnchor="end" fontSize="9" fontWeight="900" fill="#3d2a00" letterSpacing="1.5" fontFamily="Archivo Black">AVR 2025</text>

        {/* Title */}
        <text x="20" y="68" fontSize="20" fontWeight="900" fill="#1a0f00" fontStyle="italic" fontFamily="Archivo Black">SPIKE, THAT'S</text>
        <text x="20" y="90" fontSize="20" fontWeight="900" fill="#1a0f00" fontStyle="italic" fontFamily="Archivo Black">YOUR READ.</text>

        {/* ROI box */}
        <rect x="20" y="106" width="180" height="48" rx="10" fill="rgba(26,15,0,0.12)" />
        <text x="32" y="124" fontSize="9" fontWeight="900" fill="#3d2a00" letterSpacing="1.5" fontFamily="Archivo Black">ROI</text>
        <text x="32" y="148" fontSize="26" fontWeight="900" fill="#1a0f00" fontStyle="italic" fontFamily="Archivo Black">+25.4%</text>

        {/* Profit + Win rate */}
        <rect x="20" y="162" width="86" height="44" rx="8" fill="rgba(26,15,0,0.12)" />
        <text x="28" y="178" fontSize="8" fontWeight="900" fill="#3d2a00" letterSpacing="1.2" fontFamily="Archivo Black">PROFIT</text>
        <text x="28" y="198" fontSize="18" fontWeight="900" fill="#1a0f00" fontFamily="Archivo Black">+254€</text>

        <rect x="114" y="162" width="86" height="44" rx="8" fill="rgba(26,15,0,0.12)" />
        <text x="122" y="178" fontSize="8" fontWeight="900" fill="#3d2a00" letterSpacing="1.2" fontFamily="Archivo Black">WIN RATE</text>
        <text x="122" y="198" fontSize="18" fontWeight="900" fill="#1a0f00" fontFamily="Archivo Black">68%</text>

        <text x="110" y="225" textAnchor="middle" fontSize="9" fontStyle="italic" fontWeight="700" fill="#3d2a00" fontFamily="Plus Jakarta Sans">Every bet hides a truth.</text>
      </g>

      {/* Share icons floating - SVG propres */}
      <g transform="translate(30, 90)">
        <circle r="22" fill="var(--ink-800)" stroke="var(--blue-500)" strokeWidth="1.5" />
        {/* Camera icon */}
        <g transform="translate(-9, -8)" stroke="#5b83ff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 1 5 h 16 v 11 h -16 z" />
          <path d="M 5 5 l 1.5 -3 h 5 l 1.5 3" />
          <circle cx="9" cy="11" r="3" />
        </g>
      </g>
      <g transform="translate(330, 200)">
        <circle r="22" fill="var(--ink-800)" stroke="#22c55e" strokeWidth="1.5" />
        {/* Share / arrow icon */}
        <g transform="translate(-9, -9)" stroke="#22c55e" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="4" r="2.5" />
          <circle cx="4" cy="10" r="2.5" />
          <circle cx="14" cy="16" r="2.5" />
          <path d="M 6.2 8.8 l 5.6 -3.4" />
          <path d="M 6.2 11.2 l 5.6 3.4" />
        </g>
      </g>
    </svg>
  )
}
function IllusToggle() {
  // Illustration : deux faux écrans téléphone côte-à-côte avec une flèche entre eux
  // Le tap sur "INSIDERS" en haut bascule de l'un à l'autre.
  return (
    <svg viewBox="0 0 360 280" width="100%" height="100%" style={{ maxWidth: 460 }}>
      <defs>
        <linearGradient id="phoneBg1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#020b20" />
          <stop offset="100%" stopColor="#061331" />
        </linearGradient>
        <linearGradient id="phoneBg2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#061331" />
          <stop offset="100%" stopColor="#020b20" />
        </linearGradient>
      </defs>

      {/* Phone 1 (gauche) — vue Insiders/perso */}
      <g transform="translate(20, 30)">
        <rect width="130" height="220" rx="18" fill="url(#phoneBg1)" stroke="rgba(41,98,255,0.4)" strokeWidth="1.5" />

        {/* TopBar avec INSIDERS pill */}
        <g transform="translate(8, 12)">
          <circle cx="10" cy="14" r="6" fill="#f0c85a" />
          <text x="20" y="17" fontSize="9" fontWeight="900" fill="white" fontFamily="Archivo Black">12</text>
          <rect x="40" y="6" width="60" height="18" rx="9" fill="rgba(41,98,255,0.25)" stroke="rgba(91,131,255,0.6)" strokeWidth="1" />
          <text x="70" y="18" textAnchor="middle" fontSize="8" fontWeight="900" fill="#5b83ff" fontStyle="italic" fontFamily="Archivo Black" letterSpacing="0.8">INSIDERS</text>
          <circle cx="115" cy="14" r="6" fill="rgba(41,98,255,0.3)" />
        </g>

        {/* Body content stylisé */}
        <text x="14" y="62" fontSize="12" fontWeight="900" fontStyle="italic" fill="white" fontFamily="Archivo Black">MES STATS</text>
        <rect x="14" y="74" width="100" height="3" rx="1.5" fill="var(--blue-500)" opacity="0.6" />

        <rect x="14" y="86" width="100" height="40" rx="8" fill="rgba(41,98,255,0.1)" stroke="rgba(41,98,255,0.3)" strokeWidth="1" />
        <text x="20" y="100" fontSize="7" fontWeight="900" fill="rgba(255,255,255,0.5)" fontFamily="Archivo Black" letterSpacing="0.6">ROI</text>
        <text x="20" y="118" fontSize="14" fontWeight="900" fill="#22c55e" fontStyle="italic" fontFamily="Archivo Black">+12.4%</text>

        <rect x="14" y="134" width="48" height="36" rx="6" fill="rgba(41,98,255,0.1)" stroke="rgba(41,98,255,0.3)" strokeWidth="1" />
        <rect x="66" y="134" width="48" height="36" rx="6" fill="rgba(41,98,255,0.1)" stroke="rgba(41,98,255,0.3)" strokeWidth="1" />

        <rect x="14" y="180" width="100" height="28" rx="6" fill="rgba(41,98,255,0.1)" stroke="rgba(41,98,255,0.3)" strokeWidth="1" />
      </g>

      {/* Flèche bidirectionnelle au centre */}
      <g transform="translate(180, 130)">
        <circle r="22" fill="var(--blue-500)" stroke="rgba(91,131,255,0.5)" strokeWidth="2" />
        <g transform="translate(-12, -10)" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 4 8 h 17 M 4 8 l 4 -4 M 4 8 l 4 4" />
          <path d="M 20 14 h -17 M 20 14 l -4 -4 M 20 14 l -4 4" />
        </g>
      </g>

      {/* Phone 2 (droite) — vue Communauté */}
      <g transform="translate(210, 30)">
        <rect width="130" height="220" rx="18" fill="url(#phoneBg2)" stroke="rgba(240,200,90,0.4)" strokeWidth="1.5" />

        {/* TopBar avec COMMUNAUTÉ pill */}
        <g transform="translate(8, 12)">
          <circle cx="10" cy="14" r="6" fill="#f0c85a" />
          <text x="20" y="17" fontSize="9" fontWeight="900" fill="white" fontFamily="Archivo Black">12</text>
          <rect x="35" y="6" width="70" height="18" rx="9" fill="rgba(240,200,90,0.18)" stroke="rgba(240,200,90,0.5)" strokeWidth="1" />
          <text x="70" y="18" textAnchor="middle" fontSize="7" fontWeight="900" fill="#f0c85a" fontStyle="italic" fontFamily="Archivo Black" letterSpacing="0.6">COMMUNAUTÉ</text>
          <circle cx="115" cy="14" r="6" fill="rgba(240,200,90,0.3)" />
        </g>

        {/* Body : 4 cards 2x2 */}
        <text x="14" y="62" fontSize="12" fontWeight="900" fontStyle="italic" fill="white" fontFamily="Archivo Black">COMMUNAUTÉ</text>
        <rect x="14" y="74" width="100" height="3" rx="1.5" fill="var(--gold-400)" opacity="0.6" />

        {/* Hero challenge mini */}
        <rect x="14" y="84" width="100" height="38" rx="6" fill="rgba(41,98,255,0.15)" stroke="rgba(41,98,255,0.4)" strokeWidth="1" />
        <text x="20" y="96" fontSize="6" fontWeight="900" fill="#5b83ff" fontFamily="Archivo Black" letterSpacing="0.5">3 JOURS</text>
        <text x="20" y="110" fontSize="9" fontWeight="900" fill="white" fontStyle="italic" fontFamily="Archivo Black">TENNIS MASTER</text>

        {/* Grid 2x2 */}
        <rect x="14" y="130" width="48" height="36" rx="6" fill="rgba(41,98,255,0.08)" stroke="rgba(41,98,255,0.25)" strokeWidth="1" />
        <text x="20" y="144" fontSize="6" fontWeight="900" fill="rgba(255,255,255,0.5)" fontFamily="Archivo Black">AMIS</text>
        <text x="20" y="160" fontSize="13" fontWeight="900" fill="white" fontStyle="italic" fontFamily="Archivo Black">8</text>

        <rect x="66" y="130" width="48" height="36" rx="6" fill="rgba(41,98,255,0.08)" stroke="rgba(41,98,255,0.25)" strokeWidth="1" />
        <text x="72" y="144" fontSize="6" fontWeight="900" fill="rgba(255,255,255,0.5)" fontFamily="Archivo Black">RANG</text>
        <text x="72" y="160" fontSize="13" fontWeight="900" fill="white" fontStyle="italic" fontFamily="Archivo Black">14e</text>

        <rect x="14" y="172" width="48" height="36" rx="6" fill="rgba(41,98,255,0.08)" stroke="rgba(41,98,255,0.25)" strokeWidth="1" />
        <text x="20" y="186" fontSize="6" fontWeight="900" fill="rgba(255,255,255,0.5)" fontFamily="Archivo Black">PICKS</text>

        <rect x="66" y="172" width="48" height="36" rx="6" fill="rgba(41,98,255,0.08)" stroke="rgba(41,98,255,0.25)" strokeWidth="1" />
        <text x="72" y="186" fontSize="6" fontWeight="900" fill="rgba(255,255,255,0.5)" fontFamily="Archivo Black">BATTLES</text>
      </g>

      {/* Annotation pour la pill (encerclée) */}
      <g transform="translate(60, 38)">
        <ellipse cx="30" cy="10" rx="34" ry="14" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />
      </g>
      <g transform="translate(220, 38)">
        <ellipse cx="35" cy="10" rx="40" ry="14" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />
      </g>
    </svg>
  )
}
