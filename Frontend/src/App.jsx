import { useState } from 'react'
import './App.css'

const modules = [
  {
    title: 'Visitantes',
    description: 'Alta, consulta y seguimiento de ingresos de visitantes.',
  },
  {
    title: 'Usuarios',
    description: 'Administracion de cuentas, perfiles y accesos del sistema.',
  },
  {
    title: 'Reportes',
    description: 'Resumenes operativos y metricas clave para la gestion.',
  },
  {
    title: 'Recursos',
    description: 'Control y disponibilidad de espacios, equipos y materiales.',
  },
]

const visitors = [
  {
    id: 1,
    nombre: 'Lucia',
    apellido: 'Fernandez',
    mail: 'lucia.fernandez@mail.com',
    dni: '30111222',
  },
  {
    id: 2,
    nombre: 'Matias',
    apellido: 'Gomez',
    mail: 'matias.gomez@mail.com',
    dni: '28999111',
  },
  {
    id: 3,
    nombre: 'Camila',
    apellido: 'Ruiz',
    mail: 'camila.ruiz@mail.com',
    dni: '33444555',
  },
  {
    id: 4,
    nombre: 'Joaquin',
    apellido: 'Lopez',
    mail: 'joaquin.lopez@mail.com',
    dni: '35666777',
  },
]

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeView, setActiveView] = useState('home')
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [filters, setFilters] = useState({
    nombre: '',
    apellido: '',
    mail: '',
    dni: '',
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    setIsLoggedIn(true)
    setActiveView('home')
    setIsSidebarExpanded(false)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setPassword('')
    setActiveView('home')
    setIsSidebarExpanded(false)
  }

  const userName = email.trim() ? email.split('@')[0] : 'Usuario'
  const filteredVisitors = visitors.filter((visitor) => {
    const matchesNombre = visitor.nombre
      .toLowerCase()
      .includes(filters.nombre.toLowerCase())
    const matchesApellido = visitor.apellido
      .toLowerCase()
      .includes(filters.apellido.toLowerCase())
    const matchesMail = visitor.mail
      .toLowerCase()
      .includes(filters.mail.toLowerCase())
    const matchesDni = visitor.dni.includes(filters.dni)

    return matchesNombre && matchesApellido && matchesMail && matchesDni
  })

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const renderContent = () => {
    if (activeView === 'visitantes') {
      return (
        <section className="dashboard-content visitors-view">
          <div className="content-header">
            <div className="dashboard-copy">
              <span className="dashboard-badge">Visitantes</span>
              <h1>Visitantes registrados</h1>
              <p>Consulta y filtra los visitantes cargados en el sistema.</p>
            </div>

            <button type="button" className="primary-action-button">
              Nuevo visitante
            </button>
          </div>

          <section className="filters-panel">
            <label className="field">
              <span>Nombre</span>
              <input
                type="text"
                placeholder="Buscar por nombre"
                value={filters.nombre}
                onChange={(event) => handleFilterChange('nombre', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Apellido</span>
              <input
                type="text"
                placeholder="Buscar por apellido"
                value={filters.apellido}
                onChange={(event) => handleFilterChange('apellido', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Mail</span>
              <input
                type="text"
                placeholder="Buscar por mail"
                value={filters.mail}
                onChange={(event) => handleFilterChange('mail', event.target.value)}
              />
            </label>

            <label className="field">
              <span>DNI</span>
              <input
                type="text"
                placeholder="Buscar por DNI"
                value={filters.dni}
                onChange={(event) => handleFilterChange('dni', event.target.value)}
              />
            </label>
          </section>

          <section className="table-panel">
            <table className="visitors-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Mail</th>
                  <th>DNI</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((visitor) => (
                  <tr key={visitor.id}>
                    <td>{visitor.nombre}</td>
                    <td>{visitor.apellido}</td>
                    <td>{visitor.mail}</td>
                    <td>{visitor.dni}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredVisitors.length === 0 ? (
              <p className="empty-state">No se encontraron visitantes con esos filtros.</p>
            ) : null}
          </section>
        </section>
      )
    }

    return (
      <section className="dashboard-content">
        <div className="dashboard-copy">
          <span className="dashboard-badge">Dashboard</span>
          <h1>Modulos del sistema</h1>
          <p>Selecciona el modulo que queres administrar.</p>
        </div>

        <div className="cards-grid">
          {modules.map((module) => (
            <article key={module.title} className="module-card">
              <h2>{module.title}</h2>
              <p>{module.description}</p>
              <button
                type="button"
                className="module-button"
                onClick={() => setActiveView(module.title.toLowerCase())}
              >
                Ingresar
              </button>
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (isLoggedIn) {
    return (
      <main className="app-shell">
        {activeView !== 'home' ? (
          <aside className={`sidenav ${isSidebarExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="sidenav-header">
              <button
                type="button"
                className="sidenav-toggle"
                onClick={() => setIsSidebarExpanded((current) => !current)}
                aria-label={isSidebarExpanded ? 'Contraer menu lateral' : 'Expandir menu lateral'}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>

              {isSidebarExpanded ? (
                <>
                  <span className="sidenav-kicker">Navegacion</span>
                  <h2>Panel principal</h2>
                </>
              ) : null}
            </div>

            <nav className="sidenav-nav">
              <button
                type="button"
                className={`sidenav-link ${activeView === 'home' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('home')
                  setIsSidebarExpanded(false)
                }}
                aria-label="Home"
              >
                <span className="sidenav-link-icon">H</span>
                {isSidebarExpanded ? <span>Home</span> : null}
              </button>

              {modules.map((module) => {
                const moduleView = module.title.toLowerCase()
                const shortLabel = module.title.charAt(0)

                return (
                  <button
                    key={module.title}
                    type="button"
                    className={`sidenav-link ${activeView === moduleView ? 'active' : ''}`}
                    onClick={() => setActiveView(moduleView)}
                    aria-label={module.title}
                  >
                    <span className="sidenav-link-icon">{shortLabel}</span>
                    {isSidebarExpanded ? <span>{module.title}</span> : null}
                  </button>
                )
              })}
            </nav>
          </aside>
        ) : null}

        <header className="navbar">
          <span className="navbar-brand">Sistema de gestion</span>

          <div className="navbar-actions">
            <span className="navbar-user">{userName}</span>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Cerrar sesion
            </button>
          </div>
        </header>

        <div className="main-panel">
          {renderContent()}
        </div>
      </main>
    )
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-copy">
          <h1>Iniciar sesión</h1>
          <p>
            Accedé con tu correo y contraseña para entrar al sistema.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Correo</span>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button type="submit" className="login-button">
            Entrar
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
