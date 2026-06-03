import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { crearInvitacion, obtenerDestinos, obtenerConfiguracion, obtenerVisitantes } from '../services/api'
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
    titulo: '',
    descripcion: '',
    motivo: '',
  })
  const [visitantes, setVisitantes] = useState([{ email: searchParams.get('email') || '', telefono: '' }])

  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  const handleBusquedaChange = (value) => {
    setBusqueda(value)
    setShowResults(true)
    if (!value.trim()) {
      setResultados([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setBuscando(true)
      obtenerVisitantes(value).then((data) => {
        setResultados(data || [])
        setBuscando(false)
      })
    }, 300)
  }

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const addFromSearch = (visitante) => {
    const alreadyAdded = visitantes.some((v) => v.email.toLowerCase() === visitante.email.toLowerCase())
    if (alreadyAdded) return

    const emptyIndex = visitantes.findIndex((v) => !v.email.trim())
    if (emptyIndex >= 0) {
      setVisitantes((current) => current.map((v, i) =>
        i === emptyIndex ? { email: visitante.email, telefono: visitante.telefono || '' } : v
      ))
    } else {
      setVisitantes((current) => [...current, { email: visitante.email, telefono: visitante.telefono || '' }])
    }

    setBusqueda('')
    setResultados([])
    setShowResults(false)
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
          <p>Comparti los links con los visitantes:</p>
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
            <span>Titulo</span>
            <input type="text" value={form.titulo} onChange={(e) => handleFormChange('titulo', e.target.value)} placeholder="Ej: Reunion de proyecto" required />
          </label>

          <label className="field">
            <span>Descripcion (opcional)</span>
            <input type="text" value={form.descripcion} onChange={(e) => handleFormChange('descripcion', e.target.value)} placeholder="Ej: Presentacion de avances" />
          </label>

          <label className="field">
            <span>Motivo (opcional)</span>
            <input type="text" value={form.motivo} onChange={(e) => handleFormChange('motivo', e.target.value)} placeholder="Si se deja vacio, se usa el titulo" />
          </label>

          <div className="visitantes-section">
            <h2>Visitantes</h2>

            <div ref={searchRef} style={{ position: 'relative', marginBottom: 16 }}>
              <label className="field">
                <span>Buscar visitante existente</span>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => handleBusquedaChange(e.target.value)}
                  onFocus={() => { if (resultados.length > 0) setShowResults(true) }}
                  placeholder="Buscar por nombre, email o documento..."
                />
              </label>
              {showResults && (resultados.length > 0 || buscando) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: 'white', border: '1px solid rgba(20,31,56,0.16)', borderRadius: 8,
                  maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {buscando ? (
                    <div style={{ padding: '10px 14px', color: '#888' }}>Buscando...</div>
                  ) : resultados.map((v) => {
                    const alreadyAdded = visitantes.some((vis) => vis.email.toLowerCase() === v.email.toLowerCase())
                    return (
                      <div
                        key={v.guid}
                        onClick={() => !alreadyAdded && addFromSearch(v)}
                        style={{
                          padding: '10px 14px', cursor: alreadyAdded ? 'default' : 'pointer',
                          borderBottom: '1px solid rgba(20,31,56,0.06)',
                          opacity: alreadyAdded ? 0.5 : 1,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                        onMouseEnter={(e) => { if (!alreadyAdded) e.currentTarget.style.background = 'rgba(20,31,56,0.04)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <div>
                          <strong>{v.nombre} {v.apellido}</strong>
                          <span style={{ marginLeft: 8, color: '#666' }}>{v.email}</span>
                        </div>
                        {alreadyAdded && <span style={{ fontSize: '0.8rem', color: '#888' }}>Ya agregado</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

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
