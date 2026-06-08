import { Navigate, Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidenav } from './Sidenav'

export function Layout({ auth }) {
  if (!auth.isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return (
    <main className="app-shell">
      <Navbar userEmail={auth.userEmail} onSwitchUser={auth.handleLogout} />
      <Sidenav />
      <div className="main-panel">
        <Outlet />
      </div>
    </main>
  )
}
