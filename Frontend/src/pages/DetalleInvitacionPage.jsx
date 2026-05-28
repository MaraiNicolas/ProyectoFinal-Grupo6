import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { obtenerInvitacion, cancelarInvitacion } from '../services/api'
import { Button } from '../components/Button'

export function DetalleInvitacionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invitacion, setInvitacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    obtenerInvitacion(id).then((data) => {
      setInvitacion(data)
      setLoading(false)
    })
  }, [id])

  const handleCancelar = async () => {
    await cancelarInvitacion(id)
    setShowConfirm(false)
    obtenerInvitacion(id).then(setInvitacion)
  }

  if (loading) return <section className="dashboard-content"><p className="empty-state">Cargando...</p></section>
  if (!invitacion) return <section className="dashboard-content"><p className="empty-state">Invitacion no encontrada.</p></section>

  return (
    <section className="dashboard-content">
      <div className="content-header">
        <div className="dashboard-copy">
          <h1>Detalle de Invitacion</h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" onClick={() => navigate('/invitaciones')}>Volver</Button>
          {invitacion.estado !== 'Cancelada' && invitacion.estado !== 'Expirada' ? (
            <Button variant="danger" onClick={() => setShowConfirm(true)}>Cancelar invitacion</Button>
          ) : null}
        </div>
      </div>

      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="module-card">
          <p className="card-label">Estado</p>
          <h2><span className={`status-badge status-${invitacion.estado.toLowerCase()}`}>{invitacion.estado}</span></h2>
        </div>
        <div className="module-card">
          <p className="card-label">Fecha y horario</p>
          <h2>{formatDate(invitacion.fecha)}</h2>
          <p>{formatTime(invitacion.horaInicio)} - {formatTime(invitacion.horaFin)}</p>
          <p className="card-detail">Buffer: {invitacion.bufferMinutos} min</p>
        </div>
        <div className="module-card">
          <p className="card-label">Destino</p>
          <h2>{invitacion.destino?.nombre || '-'}</h2>
          <p>{invitacion.destino?.descripcion || ''}</p>
        </div>
      </div>

      <div className="module-card" style={{ marginBottom: 20 }}>
        <p className="card-label">Titulo</p>
        <p>{invitacion.titulo}</p>
        {invitacion.descripcion ? <p className="card-detail">{invitacion.descripcion}</p> : null}
        {invitacion.motivo ? <><p className="card-label" style={{ marginTop: 12 }}>Motivo</p><p>{invitacion.motivo}</p></> : null}
      </div>

      <section className="table-panel">
        <h2>Visitantes</h2>
        <table className="visitors-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Telefono</th>
              <th>Estado formulario</th>
              <th>Nombre</th>
              <th>Completado</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {invitacion.visitantes?.map((v) => (
              <tr key={v.guid}>
                <td>{v.emailVisitante}</td>
                <td>{v.telefonoVisitante || '-'}</td>
                <td><span className={`status-badge status-${v.estadoFormulario.toLowerCase()}`}>{v.estadoFormulario}</span></td>
                <td>{v.visitante ? `${v.visitante.nombre} ${v.visitante.apellido}` : '-'}</td>
                <td>{v.fechaCompletado ? new Date(v.fechaCompletado).toLocaleString('es-AR') : '-'}</td>
                <td>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}${v.link}`)}
                  >
                    Copiar link
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {showConfirm ? (
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
      ) : null}
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
