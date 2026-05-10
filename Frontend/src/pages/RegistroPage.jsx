import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerRegistro, completarRegistro } from '../services/api'

export function RegistroPage() {
  const { token } = useParams()
  const [registro, setRegistro] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
  })

  useEffect(() => {
    obtenerRegistro(token).then((data) => {
      setRegistro(data)
      if (data?.visitante) {
        setForm({
          nombre: data.visitante.nombre || '',
          apellido: data.visitante.apellido || '',
          telefono: data.visitante.telefono || '',
          tipoDocumento: 'DNI',
          numeroDocumento: '',
        })
      }
      setLoading(false)
    })
  }, [token])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const data = await completarRegistro(token, form)
      setRegistro(data)
    } catch {
      setError('Error al enviar el formulario.')
    }
  }

  if (loading) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <p>Cargando...</p>
        </section>
      </main>
    )
  }

  if (!registro || registro.estado === 'Invalido') {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <h1>Link invalido</h1>
          <p>Este link no es valido o no existe.</p>
        </section>
      </main>
    )
  }

  if (registro.estado === 'Cancelada') {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <h1>Invitacion cancelada</h1>
          <p>Esta invitacion fue cancelada por el anfitrion.</p>
          <VisitDetails registro={registro} />
        </section>
      </main>
    )
  }

  if (registro.estado === 'Expirada') {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <h1>Invitacion expirada</h1>
          <p>Esta invitacion ya expiro.</p>
          <VisitDetails registro={registro} />
        </section>
      </main>
    )
  }

  if (registro.estado === 'Completado') {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <h1>Registro completado</h1>
          <p>Tu registro fue enviado exitosamente. Recibiras un QR por email para acceder al edificio.</p>
          <VisitDetails registro={registro} />
        </section>
      </main>
    )
  }

  return (
    <main className="login-shell">
      <section className="login-panel" style={{ width: 'min(540px, 100%)' }}>
        <div className="login-copy">
          <h1>Registro de visita</h1>
          <p>Completa tus datos para confirmar tu visita.</p>
        </div>

        <VisitDetails registro={registro} />

        {registro.esVisitanteExistente ? (
          <p style={{ marginBottom: 16, color: 'var(--accent)', fontWeight: 600 }}>
            Ya te tenemos registrado. Confirma tus datos.
          </p>
        ) : null}

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nombre</span>
            <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </label>

          <label className="field">
            <span>Apellido</span>
            <input type="text" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required />
          </label>

          <label className="field">
            <span>Telefono</span>
            <input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+5491100001111" />
          </label>

          <label className="field">
            <span>Tipo de documento</span>
            <select
              value={form.tipoDocumento}
              onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value })}
              className="field-select"
            >
              <option value="DNI">DNI</option>
              <option value="Pasaporte">Pasaporte</option>
              <option value="Cedula">Cedula</option>
            </select>
          </label>

          <label className="field">
            <span>Numero de documento</span>
            <input type="text" value={form.numeroDocumento} onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value })} required />
          </label>

          {error ? <p className="login-error">{error}</p> : null}

          <button type="submit" className="login-button">
            Confirmar registro
          </button>
        </form>
      </section>
    </main>
  )
}

function VisitDetails({ registro }) {
  return (
    <div className="visit-details">
      {registro.fecha ? <p><strong>Fecha:</strong> {new Date(registro.fecha).toLocaleDateString('es-AR')}</p> : null}
      {registro.horaInicio ? <p><strong>Horario:</strong> {formatTime(registro.horaInicio)} - {formatTime(registro.horaFin)}</p> : null}
      {registro.destino ? <p><strong>Destino:</strong> {registro.destino}</p> : null}
      {registro.anfitrion ? <p><strong>Anfitrion:</strong> {registro.anfitrion}</p> : null}
      {registro.motivo ? <p><strong>Motivo:</strong> {registro.motivo}</p> : null}
    </div>
  )
}

function formatTime(timeSpan) {
  if (!timeSpan) return ''
  const parts = timeSpan.split(':')
  return `${parts[0]}:${parts[1]}`
}
