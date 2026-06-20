import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../services/api'

// Pagina de aterrizaje cuando Finnegans redirige al usuario con ?access_token=xxx.
// Valida el token contra el backend y, si es OK, guarda los datos del usuario y
// redirige al home. El access_token mismo es la credencial: se reusa en cada
// request posterior como Bearer token (no hay JWT propio).
export function SsoCallbackPage({ auth }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  // Ref para evitar que auth (que cambia tras refresh()) este en las deps del
  // efecto principal y lo dispare una segunda vez antes de navegar.
  const refreshRef = useRef(auth?.refresh)
  useEffect(() => { refreshRef.current = auth?.refresh })

  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    if (!accessToken) {
      setError('Falta access_token en la URL. Ingresa desde Finnegans GO.')
      return
    }

    api.ssoLogin(accessToken)
      .then((data) => {
        if (data?.usuario) {
          refreshRef.current?.()
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
