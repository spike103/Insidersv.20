import React from 'react'

export const AVATAR_CATALOG = [
  { id: 'avatar1', src: '/avatars/avatar1.svg', name: 'Avatar 1' },
  { id: 'avatar2', src: '/avatars/avatar2.svg', name: 'Avatar 2' },
  { id: 'avatar3', src: '/avatars/avatar3.svg', name: 'Lunettes' },
  { id: 'avatar4', src: '/avatars/avatar4.svg', name: 'Œil croisé' },
]

export function getAvatarSrc(key) {
  return AVATAR_CATALOG.find(a => a.id === key)?.src || null
}

export default function Avatar({
  user,
  avatarKey: rawAvatarKey,
  initials: rawInitials,
  color: rawColor,
  size = 40,
  fontSize,
}) {
  const avatarKey = rawAvatarKey ?? user?.avatarKey ?? user?.avatar_key ?? null
  const imgSrc = avatarKey ? getAvatarSrc(avatarKey) : null

  if (imgSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--ink-700)',
          border: '1px solid var(--ink-600)',
        }}
      >
        <img
          src={imgSrc}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    )
  }

  const initials = rawInitials || user?.initials || (
    user?.firstName ? (user.firstName.slice(0,1) + (user.lastName?.slice(0,1) || '')).toUpperCase() : '?'
  )
  const bg = rawColor || user?.avatarColor || '#2962ff'
  const fz = fontSize || Math.round(size * 0.4)

  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, ${bg}, ${bg}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: 'white',
        fontFamily: 'Archivo Black, sans-serif',
        fontSize: fz, fontWeight: 900,
        letterSpacing: '0.02em', textTransform: 'uppercase',
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  )
}
