import { useState } from 'react'
import * as api from '../services/api'

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => api.estaAutenticado())

  const usuario = api.getUsuarioActual()
  const userName = usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario'
  const userEmail = usuario?.email || ''

  const handleLogout = async () => {
    await api.logout()
    setIsLoggedIn(false)
  }

  // Permite que SsoCallbackPage refleje el cambio de estado tras un SSO exitoso.
  const refresh = () => setIsLoggedIn(api.estaAutenticado())

  return {
    isLoggedIn,
    userName,
    userEmail,
    handleLogout,
    refresh,
  }
}

