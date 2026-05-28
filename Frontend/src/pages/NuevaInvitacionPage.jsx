import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { crearInvitacion, obtenerDestinos, obtenerConfiguracion } from '../services/api'
import { Button } from '../components/Button'

export function NuevaInvitacionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [destinos, setDestinos] = useState([])
  const [, setBufferDefault] = useState(120)
  const [error, setError] = useState('')
  const [creada, setCreada] = useState(null)

  const [form, setForm] = useState({
    destinoId: '',
    fecha: '',
    horaInicio: '',
    horaFin: '',
    bufferMinutos: 120,
    motivo: '',
  })
  const [visitantes, setVisitantes] = useState([{ email: searchParams.get('email') || '', telefono: '' }])

  useEffect(() => {
    obtenerDestinos().then((data) => {
      setDestinos(data || [])
      if (data?.length > 0) setForm((f) => ({ ...f, destinoId: data[0].guid }))
    })
    obtenerConfiguracion().then((data) => {
      const buffer = data?.find((c) => c.clave === 'BufferMinutosPorDefecto')
      if (buffer) {
        const val = parseInt(buffer.valor, 10)
        setBufferDefault(val)
        setForm((f) => ({ ...f, bufferMinutos: val }))
      }
    })
  }, [])

  const handleFormChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleVisitanteChange = (index, field, value) => {
    setVisitantes((current) => current.map((v, i) => i === index ? { ...v, [field]: value } : v))
  }

  const addVisitante = () => {
    setVisitantes((current) => [...current, { email: '', telefono: '' }])
  }

  const removeVisitante = (index) => {
    setVisitantes((current) => current.filter((_, i) => i !== index))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const visitantesValidos = visitantes.filter((v) => v.email.trim())
    if (visitantesValidos.length === 0) {
      setError('Agrega al menos un visitante con email.')
      return
    }

    try {
      const data = await crearInvitacion({
        ...form,
        horaInicio: form.horaInicio + ':00',
        horaFin: form.horaFin + ':00',
        visitantes: visitantesValidos,
      })
      setCreada(data)
    } catch {
      setError('Error al crear la invitacion.')
    }
  }

  if (creada) {
    return (
      <section className="dashboard-content">
        <div className="dashboard-copy">
          <h1>Invitacion creada</h1>
          <p>Compartí los links con los visitantes:</p>
        </div>

        <section className="table-panel" style={{ marginTop: 20 }}>
          {creada.visitantes?.map((v) => (
            <div key={v.guid} className="link-row">
              <span>{v.emailVisitante}</span>
              <code>{window.location.origin}{v.link}</code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}${v.link}`)}
              >
                Copiar
              </Button>
            </div>
          ))}
        </section>

        <div className="visitor-form-actions" style={{ marginTop: 20 }}>
          <Button variant="secondary" onClick={() => navigate('/invitaciones')}>
            Ver invitaciones
          </Button>
          <Button variant="primary" onClick={() => { setCreada(null); setVisitantes([{ email: '', telefono: '' }]) }}>
            Crear otra
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-content">
      <div className="dashboard-copy">
        <h1>Nueva Invitacion</h1>
      </div>

      <section className="table-panel visitor-form-panel">
        <form className="visitor-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Destino</span>
            <select
              value={form.destinoId}
              onChange={(event) => handleFormChange('destinoId', event.target.value)}
              className="field-select"
            >
              {destinos.map((d) => (
                <option key={d.guid} value={d.guid}>{d.nombre}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Fecha</span>
            <input type="date" value={form.fecha} onChange={(e) => handleFormChange('fecha', e.target.value)} required />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label className="field">
              <span>Hora inicio</span>
              <input type="time" value={form.horaInicio} onChange={(e) => handleFormChange('horaInicio', e.target.value)} required />
            </label>
            <label className="field">
              <span>Hora fin</span>
              <input type="time" value={form.horaFin} onChange={(e) => handleFormChange('horaFin', e.target.value)} required />
            </label>
          </div>

          <label className="field">
            <span>Buffer (minutos)</span>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.bufferMinutos} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); handleFormChange('bufferMinutos', val ? parseInt(val, 10) : 0) }} />
          </label>

          <label className="field">
            <span>Motivo (opcional)</span>
            <input type="text" value={form.motivo} onChange={(e) => handleFormChange('motivo', e.target.value)} placeholder="Ej: Reunion de proyecto" />
          </label>

          <div className="visitantes-section">
            <h2>Visitantes</h2>
            {visitantes.map((v, i) => (
              <div key={i} className="visitante-row">
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={v.email} onChange={(e) => handleVisitanteChange(i, 'email', e.target.value)} placeholder="visitante@mail.com" required />
                </label>
                <label className="field">
                  <span>Telefono (opcional)</span>
                  <input type="tel" value={v.telefono} onChange={(e) => handleVisitanteChange(i, 'telefono', e.target.value)} placeholder="+5491100001111" />
                </label>
                {visitantes.length > 1 ? (
                  <Button variant="danger" size="sm" onClick={() => removeVisitante(i)} style={{ alignSelf: 'end' }}>Quitar</Button>
                ) : null}
              </div>
            ))}
            <Button variant="secondary" onClick={addVisitante}>
              Agregar visitante
            </Button>
          </div>

          {error ? <p className="login-error">{error}</p> : null}

          <div className="visitor-form-actions">
            <Button variant="secondary" onClick={() => navigate('/invitaciones')}>Cancelar</Button>
            <Button variant="primary" type="submit">Crear invitacion</Button>
          </div>
        </form>
      </section>
    </section>
  )
}
