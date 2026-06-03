import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerInvitaciones } from '../services/api'

export function HoyPage() {
  const navigate = useNavigate()
  const [invitaciones, setInvitaciones] = useState([])
  const [loading, setLoading] = useState(true)

  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    obtenerInvitaciones(hoy).then((data) => {
      setInvitaciones(data || [])
      setLoading(false)
    })
  }, [])

  const totalVisitantes = invitaciones.reduce((sum, i) => sum + (i.cantidadVisitantes || 0), 0)
  const completados = invitaciones.reduce((sum, i) => sum + (i.visitantesCompletados || 0), 0)
  const pendientes = totalVisitantes - completados

  return (
    <section className="dashboard-content">
      <div className="dashboard-copy">
        <h1>Hoy</h1>
        <p>Todas las invitaciones para el dia de hoy</p>
      </div>

      <div className="cards-grid summary-cards">
        <div className="module-card">
          <h2>{invitaciones.length}</h2>
          <p>Invitaciones</p>
        </div>
        <div className="module-card">
          <h2>{totalVisitantes}</h2>
          <p>Visitantes esperados</p>
        </div>
        <div className="module-card">
          <h2>{completados}</h2>
          <p>Formularios completados</p>
        </div>
        <div className="module-card">
          <h2>{pendientes}</h2>
          <p>Pendientes</p>
        </div>
      </div>

      <section className="table-panel" style={{ marginTop: 20 }}>
        {loading ? (
          <p className="empty-state">Cargando...</p>
        ) : invitaciones.length === 0 ? (
          <p className="empty-state">No hay invitaciones para hoy.</p>
        ) : (
          <table className="visitors-table">
            <thead>
              <tr>
                <th>Estado de formularios</th>
                <th>Titulo</th>
                <th>Motivo</th>
                <th>Horario</th>
                <th>Destino</th>
                <th>Anfitrion</th>
                <th>Visitantes</th>
              </tr>
            </thead>
            <tbody>
              {invitaciones.map((inv) => (
                <tr
                  key={inv.guid}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/invitaciones/${inv.guid}`)}
                >
                  <td>{estadoFormularios(inv)}</td>
                  <td>{inv.titulo || '-'}</td>
                  <td>{inv.motivo || '-'}</td>
                  <td>{formatTime(inv.horaInicio)} - {formatTime(inv.horaFin)}</td>
                  <td>{inv.destino?.nombre || '-'}</td>
                  <td>{inv.usuario ? `${inv.usuario.nombre} ${inv.usuario.apellido}` : '-'}</td>
                  <td>{inv.visitantesCompletados}/{inv.cantidadVisitantes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  )
}

function estadoFormularios(inv) {
  if (inv.estado === 'Cancelada') {
    return <span className="status-badge status-cancelada">Cancelada</span>
  }
  if (inv.estado === 'Expirada') {
    return <span className="status-badge status-expirada">Evento expirado</span>
  }
  const pendientes = (inv.cantidadVisitantes || 0) - (inv.visitantesCompletados || 0)
  if (pendientes === 0) {
    return <span className="status-badge status-activa">Completados</span>
  }
  return <span className="status-badge status-pendiente">{pendientes} pendientes</span>
}

function formatTime(timeSpan) {
  if (!timeSpan) return ''
  const parts = timeSpan.split(':')
  return `${parts[0]}:${parts[1]}`
}
