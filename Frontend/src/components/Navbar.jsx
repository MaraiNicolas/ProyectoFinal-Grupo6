export function Navbar({ userName, onLogout }) {
  return (
    <header className="navbar">
      <span className="navbar-brand">Sistema de gestion</span>

      <div className="navbar-actions">
        <span className="navbar-user">{userName}</span>
        <button type="button" className="logout-button" onClick={onLogout}>
          Cerrar sesion
        </button>
      </div>
    </header>
  )
}
