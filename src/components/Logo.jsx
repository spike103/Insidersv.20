import React from 'react'

export default function Logo({ size = 32, withText = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src="/icons/logo.svg" width={size} height={size * 0.96} alt="Insiders" style={{ display: 'block' }} />
      {withText && (
        <div className="font-sans" style={{ fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 16 }}>
          INSIDERS
        </div>
      )}
    </div>
  )
}
