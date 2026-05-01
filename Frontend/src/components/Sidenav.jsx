import { modules } from '../data/modules'

export function Sidenav({ activeView, onNavigate, isExpanded, onToggle }) {
  return (
    <aside className={`sidenav ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidenav-header">
        <button
          type="button"
          className="sidenav-toggle"
          onClick={onToggle}
          aria-label={isExpanded ? 'Contraer menu lateral' : 'Expandir menu lateral'}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <nav className="sidenav-nav">
        <button
          type="button"
          className={`sidenav-link ${activeView === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
          aria-label="Home"
        >
          <span className="sidenav-link-icon">H</span>
          {isExpanded ? <span>Home</span> : null}
        </button>

        {modules.map((module) => {
          const moduleView = module.title.toLowerCase()
          const shortLabel = module.title.charAt(0)

          return (
            <button
              key={module.title}
              type="button"
              className={`sidenav-link ${activeView === moduleView ? 'active' : ''}`}
              onClick={() => onNavigate(moduleView)}
              aria-label={module.title}
            >
              <span className="sidenav-link-icon">{shortLabel}</span>
              {isExpanded ? <span>{module.title}</span> : null}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
