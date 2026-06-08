import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Hoy', icon: 'H' },
  { to: '/invitaciones', label: 'Mis Invitaciones', icon: 'I' },
  { to: '/visitantes', label: 'Visitantes', icon: 'V' },
  { to: '/admin', label: 'Admin', icon: 'A' },
]

export function Sidenav() {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <aside className={`sidenav ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidenav-header">
        <button
          type="button"
          className="sidenav-toggle"
          onClick={() => setIsExpanded((current) => !current)}
          aria-label={isExpanded ? 'Contraer menu lateral' : 'Expandir menu lateral'}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <nav className="sidenav-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidenav-link ${isActive ? 'active' : ''}`}
            aria-label={item.label}
          >
            <span className="sidenav-link-icon">{item.icon}</span>
            {isExpanded ? <span>{item.label}</span> : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
