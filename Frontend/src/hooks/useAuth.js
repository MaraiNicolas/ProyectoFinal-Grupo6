import { useState } from 'react'
import * as api from '../services/api'

export function useAuth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(() => api.estaAutenticado())
  const [error, setError] = useState('')

  const usuario = api.getUsuarioActual()
  const userName = usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const data = await api.login(email, password)
      if (data?.token) {
        setIsLoggedIn(true)
      } else {
        setError(data?.mensaje || 'Error al iniciar sesion')
      }
    } catch {
      setError('No se pudo conectar con el servidor')
    }
  }

  const handleLogout = () => {
    api.logout()
    setIsLoggedIn(false)
    setEmail('')
    setPassword('')
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoggedIn,
    userName,
    error,
    handleSubmit,
    handleLogout,
  }
}
