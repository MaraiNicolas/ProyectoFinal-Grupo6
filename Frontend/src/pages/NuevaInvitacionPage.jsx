import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { crearInvitacion, obtenerDestinos, obtenerConfiguracion } from '../services/api'
import { Button } from '../components/Button'
import { BuscadorVisitantes } from '../components/BuscadorVisitantes'

const WIZARD_STEPS = [
  { key: 'titulo', label: 'Titulo del evento', required: true },
  { key: 'fechaHora', label: 'Fecha y horario', required: true },
  { key: 'destino', label: 'Destino', required: true },
  { key: 'visitantes', label: 'Visitantes', required: true },
  { key: 'opcionales', label: 'Detalles adicionales', required: false },
]

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

  const [showWizard, setShowWizard] = useState(!searchParams.get('email'))
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardDone, setWizardDone] = useState(!!searchParams.get('email'))

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

  }

  const canAdvance = () => {
    const step = WIZARD_STEPS[wizardStep]
    switch (step.key) {
      case 'titulo': return form.titulo.trim().length > 0
      case 'fechaHora': return form.fecha && form.horaInicio && form.horaFin && form.horaFin > form.horaInicio
      case 'destino': return !!form.destinoId
      case 'visitantes': return visitantes.some((v) => v.email.trim())
      case 'opcionales': return true
      default: return true
    }
  }

  const handleNext = () => {
    if (wizardStep < WIZARD_STEPS.length - 1) {
      setWizardStep(wizardStep + 1)
    } else {
      setShowWizard(false)
      setWizardDone(true)
    }
  }

  const handleBack = () => {
    if (wizardStep > 0) setWizardStep(wizardStep - 1)
  }

  const handleSkip = () => {
    handleNext()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (form.horaFin <= form.horaInicio) {
      setError('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }

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
          <Button variant="primary" onClick={() => { setCreada(null); setVisitantes([{ email: '', telefono: '' }]); setShowWizard(true); setWizardStep(0); setWizardDone(false); setForm(f => ({ ...f, titulo: '', descripcion: '', motivo: '', fecha: '', horaInicio: '', horaFin: '' })) }}>
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

      {showWizard && (
        <div className="wizard-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowWizard(false); setWizardDone(true) } }}>
          <div className="wizard-modal">
            <div className="wizard-progress">
              {WIZARD_STEPS.map((s, i) => (
                <div key={s.key} className={`wizard-dot ${i === wizardStep ? 'active' : ''} ${i < wizardStep ? 'done' : ''}`} />
              ))}
            </div>

            <h2 style={{ marginBottom: 4 }}>{WIZARD_STEPS[wizardStep].label}</h2>
            {!WIZARD_STEPS[wizardStep].required && (
              <p style={{ color: '#888', fontSize: '0.85rem', marginTop: 0, marginBottom: 16 }}>Opcional — podes omitir este paso</p>
            )}

            <div className="wizard-body">
              {WIZARD_STEPS[wizardStep].key === 'titulo' && (
                <label className="field">
                  <span>Titulo</span>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) => handleFormChange('titulo', e.target.value)}
                    placeholder="Ej: Reunion de proyecto"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter' && canAdvance()) { e.preventDefault(); handleNext() } }}
                  />
                </label>
              )}

              {WIZARD_STEPS[wizardStep].key === 'fechaHora' && (
                <>
                  <label className="field">
                    <span>Fecha</span>
                    <WeekDayPicker selectedDate={form.fecha} onSelect={(date) => handleFormChange('fecha', date)} />
                    <input type="date" value={form.fecha} onChange={(e) => handleFormChange('fecha', e.target.value)} autoFocus />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <label className="field">
                      <span>Hora inicio</span>
                      <input type="time" value={form.horaInicio} onChange={(e) => handleFormChange('horaInicio', e.target.value)} />
                    </label>
                    <label className="field">
                      <span>Hora fin</span>
                      <input type="time" value={form.horaFin} onChange={(e) => handleFormChange('horaFin', e.target.value)} />
                    </label>
                  </div>
                  {form.horaInicio && form.horaFin && form.horaFin <= form.horaInicio && (
                    <p style={{ color: '#c0392b', fontSize: '0.85rem', marginTop: 8 }}>La hora de fin debe ser posterior a la hora de inicio.</p>
                  )}
                </>
              )}

              {WIZARD_STEPS[wizardStep].key === 'destino' && (
                <label className="field">
                  <span>Destino</span>
                  <select value={form.destinoId} onChange={(e) => handleFormChange('destinoId', e.target.value)} className="field-select" autoFocus>
                    {destinos.map((d) => (
                      <option key={d.guid} value={d.guid}>{d.nombre}</option>
                    ))}
                  </select>
                </label>
              )}

              {WIZARD_STEPS[wizardStep].key === 'visitantes' && (
                <div>
                  <BuscadorVisitantes onSelect={addFromSearch} excludeEmails={visitantes.map((v) => v.email)} />

                  {visitantes.map((v, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                      <label className="field" style={{ marginBottom: 0 }}>
                        <span>Email</span>
                        <input type="email" value={v.email} onChange={(e) => handleVisitanteChange(i, 'email', e.target.value)} placeholder="visitante@mail.com" />
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                        <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                          <span>Telefono (opcional)</span>
                          <input type="tel" value={v.telefono} onChange={(e) => handleVisitanteChange(i, 'telefono', e.target.value)} placeholder="+5491100001111" />
                        </label>
                        {visitantes.length > 1 && (
                          <Button variant="danger" size="sm" onClick={() => removeVisitante(i)}>Quitar</Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={addVisitante}>Agregar visitante</Button>
                </div>
              )}

              {WIZARD_STEPS[wizardStep].key === 'opcionales' && (
                <>
                  <label className="field">
                    <span>Descripcion (opcional)</span>
                    <input type="text" value={form.descripcion} onChange={(e) => handleFormChange('descripcion', e.target.value)} placeholder="Ej: Presentacion de avances" autoFocus />
                  </label>
                  <label className="field" style={{ marginTop: 12 }}>
                    <span>Motivo (opcional)</span>
                    <input type="text" value={form.motivo} onChange={(e) => handleFormChange('motivo', e.target.value)} placeholder="Si se deja vacio, se usa el titulo" />
                  </label>
                  <label className="field" style={{ marginTop: 12 }}>
                    <span>Buffer en minutos (opcional)</span>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.bufferMinutos} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); handleFormChange('bufferMinutos', val ? parseInt(val, 10) : 0) }} />
                  </label>
                </>
              )}
            </div>

            <div className="wizard-actions">
              {wizardStep > 0 && (
                <Button variant="secondary" size="sm" onClick={handleBack}>Atras</Button>
              )}
              <div style={{ flex: 1 }} />
              {!WIZARD_STEPS[wizardStep].required && (
                <Button variant="secondary" size="sm" onClick={handleSkip}>Omitir</Button>
              )}
              <Button variant="primary" size="sm" onClick={handleNext} disabled={WIZARD_STEPS[wizardStep].required && !canAdvance()}>
                {wizardStep === WIZARD_STEPS.length - 1 ? 'Listo' : 'Siguiente'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {wizardDone && (
        <section className="table-panel visitor-form-panel">
          <form className="visitor-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Titulo</span>
              <input type="text" value={form.titulo} onChange={(e) => handleFormChange('titulo', e.target.value)} placeholder="Ej: Reunion de proyecto" required />
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
              <span>Destino</span>
              <select value={form.destinoId} onChange={(event) => handleFormChange('destinoId', event.target.value)} className="field-select">
                {destinos.map((d) => (
                  <option key={d.guid} value={d.guid}>{d.nombre}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Buffer (minutos)</span>
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.bufferMinutos} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); handleFormChange('bufferMinutos', val ? parseInt(val, 10) : 0) }} />
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

              <BuscadorVisitantes onSelect={addFromSearch} excludeEmails={visitantes.map((v) => v.email)} />

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
      )}
    </section>
  )
}

const DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

function WeekDayPicker({ selectedDate, onSelect }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayDay = today.getDay()
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  const days = DAY_LABELS.map((label, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const isPast = date < today
    const isToday = date.getTime() === today.getTime()
    const isSelected = selectedDate === dateStr
    return { label, dateStr, isPast, isToday, isSelected }
  })

  return (
    <div className="weekday-picker">
      {days.map((d) => (
        <button
          key={d.dateStr}
          type="button"
          className={`weekday-btn${d.isToday ? ' today' : ''}${d.isSelected ? ' selected' : ''}${d.isPast ? ' past' : ''}`}
          disabled={d.isPast}
          onClick={() => onSelect(d.dateStr)}
        >
          {d.label}
        </button>
      ))}
    </div>
  )
}
