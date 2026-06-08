import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { useAuth } from './hooks/useAuth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { HoyPage } from './pages/HoyPage'
import { InvitacionesPage } from './pages/InvitacionesPage'
import { NuevaInvitacionPage } from './pages/NuevaInvitacionPage'
import { DetalleInvitacionPage } from './pages/DetalleInvitacionPage'
import { VisitantesPage } from './pages/VisitantesPage'
import { AdminPage } from './pages/AdminPage'
import { RegistroPage } from './pages/RegistroPage'

function App() {
  const auth = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no shell */}
        <Route path="/login" element={
          auth.isLoggedIn ? <Navigate to="/" replace /> : <LoginPage auth={auth} />
        } />
        <Route path="/registro/:token" element={<RegistroPage />} />

        {/* Authenticated routes — with Navbar + Sidenav */}
        <Route element={<Layout auth={auth} />}>
          <Route path="/" element={<HoyPage />} />
          <Route path="/invitaciones" element={<InvitacionesPage />} />
          <Route path="/invitaciones/nueva" element={<NuevaInvitacionPage />} />
          <Route path="/invitaciones/:id" element={<DetalleInvitacionPage />} />
          <Route path="/visitantes" element={<VisitantesPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
