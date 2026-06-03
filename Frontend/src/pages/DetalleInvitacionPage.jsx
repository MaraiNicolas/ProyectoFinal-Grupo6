import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { obtenerInvitacion, cancelarInvitacion, cancelarVisitante, agregarVisitantes } from '../services/api'
import { Button } from '../components/Button'
import { estadoFormularios, estadoVisitante } from '../components/EstadoHelpers'
import { BuscadorVisitantes } from '../components/BuscadorVisitantes'

export function DetalleInvitacionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invitacion, setInvitacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [cancelVisitanteId, setCancelVisitanteId] = useState(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [nuevosVisitantes, setNuevosVisitantes] = useState([{ email: '', telefono: '' }])
  const [addError, setAddError] = useState('')

  const reload = () => obtenerInvitacion(id).then(setInvitacion)

  useEffect(() => {
    obtenerInvitacion(id).then((data) => {
      setInvitacion(data)
      setLoading(false)
    })
  }, [id])

  const allEmails = [
    ...(invitacion?.visitantes?.map((v) => v.emailVisitante?.toLowerCase()) || []),
    ...nuevosVisitantes.map((v) => v.email.toLowerCase()),
  ]

  const addFromSearch = (visitante) => {
    if (allEmails.includes(visitante.email.toLowerCase())) return

    const emptyIndex = nuevosVisitantes.findIndex((v) => !v.email.trim())
    if (emptyIndex >= 0) {
      setNuevosVisitantes((current) => current.map((v, i) =>
        i === emptyIndex ? { email: visitante.email, telefono: visitante.telefono || '' } : v
      ))
    } else {
      setNuevosVisitantes((current) => [...current, { email: visitante.email, telefono: visitante.telefono || '' }])
    }
  }

  const handleCancelar = async () => {
    await cancelarInvitacion(id)
    setShowConfirm(false)
    reload()
  }

  const handleCancelarVisitante = async () => {
    await cancelarVisitante(id, cancelVisitanteId)
    setCancelVisitanteId(null)
    reload()
  }

  const handleAgregar = async () => {
    setAddError('')
    const validos = nuevosVisitantes.filter((v) => v.email.trim())
    if (validos.length === 0) {
      setAddError('Agrega al menos un visitante con email.')
      return
    }
    await agregarVisitantes(id, validos)
    setNuevosVisitantes([{ email: '', telefono: '' }])
    setShowAddForm(false)
    reload()
  }

  if (loading) return <section className="dashboard-content"><p className="empty-state">Cargando...</p></section>
  if (!invitacion) return <section className="dashboard-content"><p className="empty-state">Invitacion no encontrada.</p></section>

  const canAddVisitors = invitacion.estado !== 'Cancelada' && invitacion.estado !== 'Expirada'

  return (
    <section className="dashboard-content">
      <div className="content-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>{invitacion.titulo}</h1>
          {invitacion.descripcion && <p style={{ color: '#666', marginTop: 4 }}>{invitacion.descripcion}</p>}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" onClick={() => navigate('/invitaciones')}>Volver</Button>
          {canAddVisitors && (
            <Button variant="danger" onClick={() => setShowConfirm(true)}>Cancelar invitacion</Button>
          )}
        </div>
      </div>

      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        <div className="module-card">
          <p className="card-label">Estado de formularios</p>
          <h2>{estadoFormularios(invitacion)}</h2>
        </div>
        <div className="module-card">
          <p className="card-label">Fecha</p>
          <h2>{formatDate(invitacion.fecha)}</h2>
          <p>{formatTime(invitacion.horaInicio)} - {formatTime(invitacion.horaFin)}</p>
          <p className="card-detail">Buffer: {invitacion.bufferMinutos} min</p>
        </div>
        <div className="module-card">
          <p className="card-label">Destino</p>
          <h2>{invitacion.destino?.nombre || '-'}</h2>
          <p>{invitacion.destino?.descripcion || ''}</p>
        </div>
        {invitacion.motivo && (
          <div className="module-card">
            <p className="card-label">Motivo</p>
            <h2 style={{ fontSize: '1rem', fontWeight: 500 }}>{invitacion.motivo}</h2>
          </div>
        )}
      </div>

      <section className="table-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Visitantes</h2>
          {canAddVisitors && !showAddForm && (
            <Button variant="primary" size="sm" onClick={() => setShowAddForm(true)}>Agregar visitante</Button>
          )}
        </div>

        {showAddForm && (
          <div style={{ marginBottom: 20, padding: 16, background: 'rgba(20,31,56,0.02)', borderRadius: 12 }}>
            <BuscadorVisitantes onSelect={addFromSearch} excludeEmails={allEmails} />

            {nuevosVisitantes.map((v, i) => (
              <div key={i} className="visitante-row">
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={v.email} onChange={(e) => setNuevosVisitantes((c) => c.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} placeholder="visitante@mail.com" />
                </label>
                <label className="field">
                  <span>Telefono (opcional)</span>
                  <input type="tel" value={v.telefono} onChange={(e) => setNuevosVisitantes((c) => c.map((x, j) => j === i ? { ...x, telefono: e.target.value } : x))} placeholder="+5491100001111" />
                </label>
                {nuevosVisitantes.length > 1 && (
                  <Button variant="danger" size="sm" onClick={() => setNuevosVisitantes((c) => c.filter((_, j) => j !== i))} style={{ alignSelf: 'end' }}>Quitar</Button>
                )}
              </div>
            ))}

            {addError && <p className="login-error">{addError}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button variant="secondary" size="sm" onClick={() => setNuevosVisitantes((c) => [...c, { email: '', telefono: '' }])}>Agregar otro</Button>
              <div style={{ flex: 1 }} />
              <Button variant="secondary" size="sm" onClick={() => { setShowAddForm(false); setNuevosVisitantes([{ email: '', telefono: '' }]) }}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={handleAgregar}>Guardar</Button>
            </div>
          </div>
        )}

        <table className="visitors-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Telefono</th>
              <th>Estado formulario</th>
              <th>Nombre</th>
              <th>Completado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {invitacion.visitantes?.map((v) => (
              <tr key={v.guid}>
                <td>{v.emailVisitante}</td>
                <td>{v.telefonoVisitante || '-'}</td>
                <td>{estadoVisitante(v)}</td>
                <td>{v.visitante ? `${v.visitante.nombre} ${v.visitante.apellido}` : '-'}</td>
                <td>{v.fechaCompletado ? new Date(v.fechaCompletado).toLocaleString('es-AR') : '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}${v.link}`)}
                    >
                      Copiar link
                    </Button>
                    {v.estadoFormulario !== 'Cancelado' && invitacion.estado !== 'Cancelada' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setCancelVisitanteId(v.guid)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {cancelVisitanteId && (
        <div className="confirm-overlay" onClick={() => setCancelVisitanteId(null)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Cancelar visitante</h2>
            <p>Estas seguro que deseas cancelar este visitante? Su link de registro dejara de funcionar.</p>
            <div className="confirm-actions">
              <Button variant="secondary" onClick={() => setCancelVisitanteId(null)}>No</Button>
              <Button variant="danger" onClick={handleCancelarVisitante}>Si, cancelar</Button>
            </div>
          </section>
        </div>
      )}

      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Cancelar invitacion</h2>
            <p>Estas seguro que deseas cancelar esta invitacion? Esta accion no se puede deshacer.</p>
            <div className="confirm-actions">
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>No</Button>
              <Button variant="danger" onClick={handleCancelar}>Si, cancelar</Button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-AR')
}

function formatTime(timeSpan) {
  if (!timeSpan) return ''
  const parts = timeSpan.split(':')
  return `${parts[0]}:${parts[1]}`
}
