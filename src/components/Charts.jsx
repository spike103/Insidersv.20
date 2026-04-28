import React from 'react'

export function ROICurve({ data, width = 330, height = 120, color = '#22c55e' }) {
  if (!data || data.length < 2) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontSize: 12 }}>Pas assez de données</div>
  }
  const W = width, H = height
  const pad = { t: 10, b: 10 }
  const min = Math.min(...data, 0), max = Math.max(...data, 0)
  const range = (max - min) || 1
  const step = W / (data.length - 1)
  const y = v => H - pad.b - ((v - min) / range) * (H - pad.t - pad.b)
  const pts = data.map((v, i) => [i * step, y(v)])
  const zeroY = y(0)
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ')
  const areaPath = path + ` L ${pts[pts.length - 1][0]},${H} L ${pts[0][0]},${H} Z`
  const id = `g${Math.random().toString(36).slice(2, 7)}`
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
      <path d={areaPath} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="5" fill={color} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="9" fill={color} opacity="0.25" />
    </svg>
  )
}

export function Ring({ value, max = 100, size = 80, stroke = 8, color = '#2962ff', track = 'var(--ink-600)', children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  const offset = c * (1 - pct)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

export function Radar({ data, size = 200, color = '#2962ff' }) {
  if (!data || data.length === 0) return null
  const cx = size / 2, cy = size / 2, r = size / 2 - 28
  const n = data.length
  const angle = i => -Math.PI / 2 + (i / n) * Math.PI * 2
  const point = (i, v) => {
    const a = angle(i); const rr = r * (v / 100)
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]
  }
  const poly = data.map((d, i) => point(i, d.value)).map(p => p.join(',')).join(' ')
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <circle key={i} cx={cx} cy={cy} r={r * f} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" />
      })}
      <polygon points={poly} fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => {
        const a = angle(i)
        const tx = cx + Math.cos(a) * (r + 16)
        const ty = cy + Math.sin(a) * (r + 16)
        return (
          <text key={d.label} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fontWeight="600" fill="var(--fg-2)" fontFamily="Poppins">{d.label}</text>
        )
      })}
      {data.map((d, i) => {
        const [x, y] = point(i, d.value)
        return <circle key={i} cx={x} cy={y} r="3.5" fill={color} stroke="var(--ink-900)" strokeWidth="1.5" />
      })}
    </svg>
  )
}

export function Heatmap({ data, accent = '#2962ff' }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.flat(), 1)
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
        {days.map((d, i) => (
          <div key={i} style={{ height: 12, fontSize: 9, color: 'var(--fg-3)', fontWeight: 600, width: 10 }}>{d}</div>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2 }}>
          {data.flatMap((row, di) =>
            row.map((v, hi) => {
              const a = v === 0 ? 0.05 : 0.15 + (v / max) * 0.85
              return (
                <div key={`${di}-${hi}`} style={{
                  aspectRatio: '1', borderRadius: 2,
                  background: v === 0 ? 'var(--ink-700)' : accent,
                  opacity: v === 0 ? 0.25 : a,
                }} />
              )
            })
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--fg-3)', marginTop: 4 }}>
          <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span>
        </div>
      </div>
    </div>
  )
}

export function SurfaceBar({ label, roi, bets, win, max = 25 }) {
  const pct = Math.min(1, Math.abs(roi) / max)
  const positive = roi >= 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{bets} paris · {win}% réussis</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 10, background: 'var(--ink-700)', borderRadius: 999, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: positive ? '50%' : `${50 - pct * 50}%`,
            width: `${pct * 50}%`,
            background: positive ? 'var(--win-500)' : 'var(--loss-500)',
            borderRadius: 999,
          }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, width: 56, textAlign: 'right', color: positive ? 'var(--win-500)' : 'var(--loss-500)' }}>
          {positive ? '+' : ''}{roi.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

export function BarChart({ data, width = 330, height = 110 }) {
  if (!data || data.length === 0) return null
  const W = width, H = height
  const pad = { t: 8, b: 22 }
  const max = Math.max(...data.map(d => Math.abs(d.v))) || 1
  const barW = (W / data.length) * 0.58
  const gap = (W / data.length)
  const zeroY = pad.t + (H - pad.t - pad.b) * 0.5
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} preserveAspectRatio="none">
      <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
      {data.map((d, i) => {
        const h = (Math.abs(d.v) / max) * ((H - pad.t - pad.b) * 0.45)
        const x = i * gap + gap / 2 - barW / 2
        const y = d.v >= 0 ? zeroY - h : zeroY
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx="3" fill={d.v >= 0 ? '#22c55e' : '#ef4444'} />
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--fg-3)" fontFamily="Poppins">{d.m}</text>
          </g>
        )
      })}
    </svg>
  )
}

// === MonthlyBar : bar chart profit par mois (screenshot "Monthly profit") ===
export function MonthlyBar({ data, height = 130, currency = '€' }) {
  // data: [{ month: 'NOV', profit: 45 }, ...]
  const [activeIdx, setActiveIdx] = React.useState(null)

  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontSize: 12 }}>Aucune donnée</div>
  }
  const max = Math.max(...data.map(d => Math.abs(d.profit)), 1)
  const barAreaH = height - 40
  const gap = 12

  const active = activeIdx != null ? data[activeIdx] : null

  return (
    <div style={{ width: '100%' }}>
      {/* Tooltip zone — reserved even when empty to prevent layout shift */}
      <div style={{
        height: 36, display: 'flex', alignItems: 'flex-end', justifyContent: active ? 'flex-start' : 'center',
        paddingBottom: 4,
      }}>
        {active ? (
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: active.profit >= 0 ? 'var(--win-500)' : 'var(--loss-500)', lineHeight: 1 }}>
              {active.profit >= 0 ? '+' : ''}{active.profit.toFixed(2)}{currency}
            </div>
            <div style={{ fontSize: 10, color: 'var(--fg-3)', fontWeight: 600, letterSpacing: '0.05em', marginTop: 2 }}>
              {active.month}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--fg-4)', fontStyle: 'italic' }}>Appuie sur un mois</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: barAreaH, gap }}>
        {data.map((d, i) => {
          const h = Math.max(4, (Math.abs(d.profit) / max) * (barAreaH - 4))
          const isPos = d.profit >= 0
          const isActive = activeIdx === i
          return (
            <button
              key={i}
              onClick={() => setActiveIdx(isActive ? null : i)}
              style={{
                flex: 1, minWidth: 0,
                height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 36,
                  height: h,
                  background: isPos ? 'var(--win-500)' : 'var(--loss-500)',
                  borderRadius: 6,
                  opacity: d.profit === 0 ? 0.25 : (isActive ? 1 : (activeIdx != null ? 0.45 : 1)),
                  outline: isActive ? `2px solid ${isPos ? 'var(--win-500)' : 'var(--loss-500)'}` : 'none',
                  outlineOffset: 3,
                  transition: 'opacity 200ms, outline 150ms',
                }}
              />
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, gap }}>
        {data.map((d, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center',
            fontSize: 10,
            color: activeIdx === i ? 'var(--blue-500)' : 'var(--fg-3)',
            fontWeight: activeIdx === i ? 700 : 600,
            letterSpacing: '0.05em', minWidth: 0,
          }}>
            {d.month}
          </div>
        ))}
      </div>
    </div>
  )
}

// === InteractiveROICurve : courbe avec tooltip on hover/touch ===
export function InteractiveROICurve({ points, width = 330, height = 160, color = '#22c55e', currency = '€' }) {
  const [hoverIdx, setHoverIdx] = React.useState(null)

  if (!points || points.length < 2) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontSize: 12 }}>Pas assez de données</div>
  }

  const W = width, H = height
  const pad = { t: 24, b: 30, l: 8, r: 8 }
  const values = points.map(p => p.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const range = (max - min) || 1
  const stepX = (W - pad.l - pad.r) / (points.length - 1)
  const y = v => pad.t + ((max - v) / range) * (H - pad.t - pad.b)
  const x = i => pad.l + i * stepX

  const pts = points.map((p, i) => [x(i), y(p.value)])
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ')
  const areaPath = path + ` L ${pts[pts.length - 1][0]},${H - pad.b} L ${pts[0][0]},${H - pad.b} Z`
  const zeroY = y(0)
  const id = `g${Math.random().toString(36).slice(2, 7)}`

  // Points hauts et bas à marquer — on ne cherche QUE parmi les valeurs réelles
  // (pas dans [min, 0] ou [max, 0] qui peut contenir un 0 absent des données)
  let maxIdx = 0
  let minIdx = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[maxIdx]) maxIdx = i
    if (values[i] < values[minIdx]) minIdx = i
  }
  const lastIdx = points.length - 1

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const relX = ((clientX - rect.left) / rect.width) * W
    let closest = 0
    let closestDist = Infinity
    pts.forEach((p, i) => {
      const d = Math.abs(p[0] - relX)
      if (d < closestDist) {
        closestDist = d
        closest = i
      }
    })
    setHoverIdx(closest)
  }
  const handleLeave = () => setHoverIdx(null)

  const display = hoverIdx != null ? points[hoverIdx] : points[lastIdx]

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Tooltip */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          pointerEvents: 'none', padding: '0 8px',
        }}
      >
        <div>
          {(() => {
            // Si le point a un `delta` (= bénéfice net), on l'affiche
            // Sinon on retombe sur `value` (bankroll absolue, back-compat)
            const shown = display.delta !== undefined ? display.delta : display.value
            const isPositive = shown >= 0
            return (
              <div style={{ fontSize: 18, fontWeight: 700, color: isPositive ? 'var(--win-500)' : 'var(--loss-500)' }}>
                {isPositive ? '+' : ''}{shown.toFixed(2)}{currency}
              </div>
            )
          })()}
          {display.label && <div style={{ fontSize: 10, color: 'var(--fg-3)', fontWeight: 600 }}>{display.label}</div>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--fg-3)', fontWeight: 600 }}>
          {hoverIdx != null ? 'Cliqué' : 'Dernier'}
        </div>
      </div>

      <svg
        width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', touchAction: 'none', cursor: 'pointer' }}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchMove={handleMove}
        onTouchEnd={handleLeave}
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
        <path d={areaPath} fill={`url(#${id})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Point haut */}
        {maxIdx !== lastIdx && maxIdx !== minIdx && (
          <g>
            <circle cx={pts[maxIdx][0]} cy={pts[maxIdx][1]} r="5" fill="var(--win-500)" stroke="var(--ink-900)" strokeWidth="2" />
          </g>
        )}
        {/* Point bas */}
        {minIdx !== lastIdx && minIdx !== maxIdx && (
          <g>
            <circle cx={pts[minIdx][0]} cy={pts[minIdx][1]} r="5" fill="var(--loss-500)" stroke="var(--ink-900)" strokeWidth="2" />
          </g>
        )}

        {/* Hover indicator */}
        {hoverIdx != null && (
          <g>
            <line x1={pts[hoverIdx][0]} y1={pad.t} x2={pts[hoverIdx][0]} y2={H - pad.b} stroke={color} strokeDasharray="3 3" strokeOpacity="0.4" />
            <circle cx={pts[hoverIdx][0]} cy={pts[hoverIdx][1]} r="7" fill={color} stroke="var(--ink-900)" strokeWidth="2" />
          </g>
        )}

        {/* Last point always visible */}
        {hoverIdx == null && (
          <circle cx={pts[lastIdx][0]} cy={pts[lastIdx][1]} r="5" fill={color} />
        )}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>{points[0].label || ''}</span>
        <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>{points[lastIdx].label || ''}</span>
      </div>
    </div>
  )
}
