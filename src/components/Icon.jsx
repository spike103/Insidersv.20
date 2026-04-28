import React from 'react'

// Icônes custom chargées depuis /public/icons/
// Filter tricks pour recolorer les SVG blancs
const CUSTOM_ICONS = [
  'add', 'arrow-down', 'bell', 'bell-notification', 'calendar-clock',
  'clear', 'coins', 'crown', 'dashboard', 'filter', 'home', 'incognito',
]

const FILTERS = {
  white: 'brightness(0) invert(1)',
  blue: 'invert(34%) sepia(88%) saturate(3800%) hue-rotate(217deg) brightness(100%)',
  gold: 'brightness(0) saturate(100%) invert(82%) sepia(58%) saturate(453%) hue-rotate(358deg) brightness(103%) contrast(101%)',
  green: 'invert(60%) sepia(75%) saturate(450%) hue-rotate(90deg) brightness(95%)',
  red: 'invert(45%) sepia(80%) saturate(4000%) hue-rotate(340deg) brightness(100%)',
  muted: 'brightness(0) invert(1) opacity(0.5)',
}

// SVG paths inline (fallback Lucide-style)
const INLINE = {
  plus: (<path d="M12 5v14M5 12h14" />),
  close: (<path d="M18 6L6 18M6 6l12 12" />),
  check: (<path d="M5 12l5 5L20 7" />),
  chevron_right: (<path d="M9 6l6 6-6 6" />),
  chevron_left: (<path d="M15 6l-6 6 6 6" />),
  chevron_down: (<path d="M6 9l6 6 6-6" />),
  chevron_up: (<path d="M18 15l-6-6-6 6" />),
  arrow_right: (<><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></>),
  trending_up: (<><path d="M22 7l-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></>),
  brain: (<><path d="M9.5 4a3 3 0 0 0-3 3v.5a3 3 0 0 0-2 5.32V14a3 3 0 0 0 3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0 3-3v-1.18A3 3 0 0 0 17.5 7.5V7a3 3 0 0 0-3-3 3 3 0 0 0-2.5 1.34A3 3 0 0 0 9.5 4z" /><path d="M9 12a2 2 0 1 0 4 0M12 5.34V20" /></>),
  trending_down: (<><path d="M22 17l-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" /></>),
  fire: (<path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />),
  sparkle: (<><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" /></>),
  trophy: (<><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z" /></>),
  user: (<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  users: (<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>),
  logout: (<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>),
  search: (<><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>),
  edit: (<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" /></>),
  trash: (<><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></>),
  share: (<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></>),
  bell: (<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></>),
  eye: (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>),
  wallet: (<><path d="M20 12V8H6a2 2 0 01-2-2 2 2 0 012-2h12v4" /><path d="M4 6v12a2 2 0 002 2h14v-4" /><path d="M18 12a2 2 0 100 4h4v-4z" /></>),
  target: (<><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>),
  refresh: (<><path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" /></>),
  chart_line: (<><path d="M3 3v18h18" /><path d="M7 15l4-6 4 3 5-7" /></>),
  chart_bar: (<><path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="8" /><rect x="12" y="6" width="3" height="12" /><rect x="17" y="13" width="3" height="5" /></>),
  camera: (<><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></>),
  star: (<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />),
  info: (<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>),
  match: (<><circle cx="12" cy="12" r="10" /><path d="M18.09 5.91A7 7 0 015.91 18.09M5.91 5.91A7 7 0 0018.09 18.09" /></>),
  live: (<><circle cx="12" cy="12" r="3" fill="currentColor" /><circle cx="12" cy="12" r="7" /></>),
  shield: (<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
}

export default function Icon({ name, size = 20, color = 'white', className = '', style, stroke = 'currentColor', strokeWidth = 2, fill = 'none' }) {
  // Custom SVG from /icons/
  if (CUSTOM_ICONS.includes(name)) {
    return (
      <img
        src={`/icons/${name}.svg`}
        alt=""
        className={className}
        style={{ width: size, height: size, filter: FILTERS[color] || FILTERS.white, display: 'block', ...style }}
      />
    )
  }
  // Inline SVG fallback
  const path = INLINE[name]
  if (!path) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill} stroke={stroke} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}
    >
      {path}
    </svg>
  )
}
