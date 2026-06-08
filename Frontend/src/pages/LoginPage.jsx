const USUARIOS = [
  { email: 'admin@empresa.com', password: 'admin123', label: 'Admin' },
  { email: 'empleado1@empresa.com', password: 'emp123', label: 'Empleado 1' },
  { email: 'empleado2@empresa.com', password: 'emp123', label: 'Empleado 2' },
]

export function LoginPage({ auth }) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-copy">
          <h1>Iniciar sesion</h1>
          <p>Selecciona un usuario para ingresar al sistema.</p>
        </div>

        <div className="user-select-list">
          {USUARIOS.map((u) => (
            <button
              key={u.email}
              className="user-select-item"
              onClick={() => auth.loginAs(u.email, u.password)}
            >
              <div className="user-select-avatar">{u.label[0]}</div>
              <div className="user-select-info">
                <span className="user-select-name">{u.label}</span>
                <span className="user-select-email">{u.email}</span>
              </div>
            </button>
          ))}
        </div>

        {auth.error ? <p className="login-error">{auth.error}</p> : null}
      </section>
    </main>
  )
}
