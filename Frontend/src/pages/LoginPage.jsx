export function LoginPage({ auth }) {
  const { email, setEmail, password, setPassword, handleSubmit, error } = auth

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-copy">
          <h1>Iniciar sesion</h1>
          <p>Accede con tu correo y contrasena para entrar al sistema.</p>
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
            <span>Contrasena</span>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="login-error">{error}</p> : null}

          <button type="submit" className="login-button">
            Entrar
          </button>
        </form>
      </section>
    </main>
  )
}
