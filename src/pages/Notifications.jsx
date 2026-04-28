import React from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Icon from '../components/Icon.jsx'
import { useApp } from '../contexts/AppContext.jsx'

export default function Notifications() {
  const navigate = useNavigate()
  const { notifications, ignoreAlert, updateUser, user } = useApp()

  const activate = (id) => {
    const activated = user.alertsActivated || []
    updateUser({ alertsActivated: [...activated.filter(a => a !== id), id] })
  }

  const isActivated = (id) => (user?.alertsActivated || []).includes(id)

  return (
    <>
      <TopBar title="Notifications" showBack />
      <div className="px-5 pt-2 pb-28">
        {notifications.length === 0 ? (
          <div className="card p-8 text-center">
            <Icon name="bell" size={40} color="muted" className="mx-auto mb-3" />
            <h3 className="h3 mb-1">Aucune notification</h3>
            <p className="body">Tes alertes personnalisées apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const isWarning = n.kind === 'warning'
              const activated = isActivated(n.id)
              return (
                <div
                  key={n.id}
                  className={isWarning ? 'card-gold' : 'card'}
                  style={{ padding: 16, color: isWarning ? '#1a0f00' : 'var(--fg-1)' }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Icon name={isWarning ? 'sparkle' : 'bell'} size={20} color="white" style={isWarning ? { filter: 'none' } : {}} />
                    <div className="flex-1 min-w-0">
                      <div className="micro" style={{ color: isWarning ? '#3d2a00' : 'var(--blue-500)', fontWeight: 700 }}>
                        {isWarning ? 'ALERTE' : 'INFO'}
                      </div>
                      <div className="h3 mt-1" style={{ fontSize: 15 }}>{n.title}</div>
                      <p className="body mt-1" style={{ color: isWarning ? '#1a0f00' : 'var(--fg-2)', fontSize: 13 }}>{n.body}</p>
                    </div>
                  </div>
                  {!activated && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => activate(n.id)}
                        className="btn-primary"
                        style={{ flex: 1, padding: '10px', fontSize: 13, ...(isWarning ? { background: '#1a0f00', color: '#f0c85a', boxShadow: 'none' } : {}) }}
                      >
                        Activer l'alerte
                      </button>
                      <button
                        onClick={() => ignoreAlert(n.id)}
                        className="btn-ghost"
                        style={{ flex: 1, padding: '10px', fontSize: 13, ...(isWarning ? { background: 'rgba(26,15,0,0.1)', borderColor: 'rgba(26,15,0,0.3)', color: '#1a0f00' } : {}) }}
                      >
                        Ignorer
                      </button>
                    </div>
                  )}
                  {activated && (
                    <div className="caption flex items-center gap-2" style={{ color: isWarning ? '#3d2a00' : 'var(--win-500)' }}>
                      <Icon name="check" size={14} color={isWarning ? 'white' : 'green'} style={isWarning ? { filter: 'none' } : {}} />
                      Alerte activée
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
