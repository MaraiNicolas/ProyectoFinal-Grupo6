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

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setPassword('')
  }

  const userName = email.trim() ? email.split('@')[0] : 'Usuario'

  if (isLoggedIn) {
    return (
      <main className="dashboard-shell">
        <header className="navbar">

          <div className="navbar-actions">
            <span className="navbar-user">{userName}</span>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Cerrar sesion
            </button>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="dashboard-copy">
            <h1>Modulos del sistema</h1>
            <p>Selecciona el modulo que queres administrar.</p>
          </div>

          <div className="cards-grid">
            {modules.map((module) => (
              <article key={module.title} className="module-card">
                <h2>{module.title}</h2>
                <p>{module.description}</p>
                <button type="button" className="module-button">
                  Ingresar
                </button>
              </article>
            ))}
          </div>
        </section>
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
