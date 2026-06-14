// Tokens del mock de Finnegans (solo aparecen si VITE_SHOW_MOCK_SSO=true en .env).
// Pensado para desarrollo: el equipo puede probar el flujo SSO completo sin
// necesidad de credenciales reales. En produccion no se renderizan.
const MOCK_TOKENS = [
  { token: 'mock-admin-token', label: 'Admin (admin@empresa.com)' },
  { token: 'mock-empleado-token', label: 'Empleado (empleado1@empresa.com)' },
  { token: 'mock-nuevo-token', label: 'Usuario nuevo (auto-create)' },
]

export function LoginPage() {
  const showMockSso = import.meta.env.VITE_SHOW_MOCK_SSO === 'true'

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-copy">
          <h1>Iniciar sesion</h1>
          <p>
            El acceso a esta aplicacion se realiza desde Finnegans GO. Ingresa
            en tu cuenta de Finnegans GO y haz click en el acceso a esta app.
          </p>
        </div>

        {showMockSso ? (
          <div className="user-select-list">
            <p className="login-copy">
              <strong>Modo desarrollo:</strong> tokens mock para probar el SSO sin
              credenciales reales.
            </p>
            {MOCK_TOKENS.map((m) => (
              <a
                key={m.token}
                className="user-select-item"
                href={`/auth/sso?access_token=${encodeURIComponent(m.token)}`}
              >
                <div className="user-select-avatar">{m.label[0]}</div>
                <div className="user-select-info">
                  <span className="user-select-name">{m.label}</span>
                  <span className="user-select-email">{m.token}</span>
                </div>
              </a>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  )
}

