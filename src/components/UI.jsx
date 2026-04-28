import React from 'react'
import Icon from './Icon.jsx'

export function EmptyState({ icon = 'info', title, description, action, children }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center mb-4">
        <Icon name={icon} size={28} className="text-tertiary" />
      </div>
      {title && <h3 className="font-display font-bold text-lg mb-1">{title}</h3>}
      {description && <p className="text-sm text-secondary max-w-xs mb-4">{description}</p>}
      {action}
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border-t border-subtle w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-hidden animate-slide-up flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-elevated flex items-center justify-center">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 scrollbar-hide">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-subtle">{footer}</div>}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <div className="flex-1 min-w-0">
        {label && <div className="text-sm font-semibold">{label}</div>}
        {description && <div className="text-xs text-secondary mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-accent-blue' : 'bg-elevated'}`}
        style={{ background: checked ? 'linear-gradient(135deg, #3B82F6, #06B6D4)' : undefined }}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  )
}

export function StatCard({ label, value, trend, icon, compact = false }) {
  const trendPositive = trend != null && trend >= 0
  return (
    <div className={`card p-3 ${compact ? '' : 'p-4'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-secondary uppercase tracking-wide">{label}</span>
        {icon && <Icon name={icon} size={14} className="text-tertiary" />}
      </div>
      <div className={`font-display font-black ${compact ? 'text-xl' : 'text-2xl'}`} style={{ color: trendPositive ? '#10B981' : trend != null ? '#EF4444' : 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display font-bold text-base">{children}</h2>
      {action}
    </div>
  )
}
