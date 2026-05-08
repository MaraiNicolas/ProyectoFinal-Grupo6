import { Navigate, Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidenav } from './Sidenav'

export function Layout({ auth }) {
  if (!auth.isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return (
    <main className="app-shell">
      <Navbar userName={auth.userName} onLogout={auth.handleLogout} />
      <Sidenav />
      <div className="main-panel">
        <Outlet />
      </div>
    </main>
  )
}
