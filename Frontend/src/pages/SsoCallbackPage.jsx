import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../services/api'

// Pagina de aterrizaje cuando Finnegans redirige al usuario con ?access_token=xxx.
// Valida el token contra el backend y, si es OK, guarda el JWT y redirige al home.
export function SsoCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    if (!accessToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Falta access_token en la URL')
      return
    }

    api.ssoLogin(accessToken)
      .then((data) => {
        if (data?.token) {
          navigate('/', { replace: true })
        } else {
          setError(data?.mensaje || 'No se pudo iniciar sesion con Finnegans')
        }
      })
      .catch(() => setError('Error al validar el token con Finnegans'))
  }, [searchParams, navigate])

  return (
    <main className="login-shell">
      <section className="login-panel">
        {error ? (
          <>
            <h1>Error de autenticacion</h1>
            <p className="login-error">{error}</p>
          </>
        ) : (
          <>
            <h1>Iniciando sesion...</h1>
            <p>Validando credenciales con Finnegans</p>
          </>
        )}
      </section>
    </main>
  )
}