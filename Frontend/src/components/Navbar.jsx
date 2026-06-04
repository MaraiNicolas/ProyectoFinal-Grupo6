export function Navbar({ userEmail, onSwitchUser }) {
  return (
    <header className="navbar">
      <span className="navbar-brand">Sistema de gestion</span>

      <div className="navbar-actions">
        <button className="navbar-user-btn" onClick={onSwitchUser}>
          {userEmail}
        </button>
      </div>
    </header>
  )
}
