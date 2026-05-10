import { Button } from './Button'

export function Navbar({ userName, onLogout }) {
  return (
    <header className="navbar">
      <span className="navbar-brand">Sistema de gestion</span>

      <div className="navbar-actions">
        <span className="navbar-user">{userName}</span>
        <Button variant="brand" size="sm" onClick={onLogout}>
          Cerrar sesion
        </Button>
      </div>
    </header>
  )
}
