import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerInvitaciones } from '../services/api'
import { Button } from '../components/Button'

export function InvitacionesPage() {
  const navigate = useNavigate()
  const [invitaciones, setInvitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroFecha, setFiltroFecha] = useState('')

  useEffect(() => {
    let cancelled = false
    obtenerInvitaciones(filtroFecha || undefined).then((data) => {
      if (!cancelled) {
        setInvitaciones(data || [])
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [filtroFecha])

  return (
    <section className="dashboard-content visitors-view">
      <div className="content-header">
        <div className="dashboard-copy">
          <h1>Mis Invitaciones</h1>
        </div>
        <Button variant="primary" onClick={() => navigate('/invitaciones/nueva')}>
          Nueva invitacion
        </Button>
      </div>

      <section className="filters-panel">
        <label className="field">
          <span>Filtrar por fecha</span>
          <input
            type="date"
            value={filtroFecha}
            onChange={(event) => setFiltroFecha(event.target.value)}
          />
        </label>
      </section>

      <section className="table-panel">
        {loading ? (
          <p className="empty-state">Cargando...</p>
        ) : invitaciones.length === 0 ? (
          <p className="empty-state">No hay invitaciones.</p>
        ) : (
          <table className="visitors-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Motivo</th>
                <th>Destino</th>
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
                  <td><span className={`status-badge status-${inv.estado.toLowerCase()}`}>{inv.estado}</span></td>
                  <td>{formatDate(inv.fecha)}</td>
                  <td>{formatTime(inv.horaInicio)} - {formatTime(inv.horaFin)}</td>
                  <td>{inv.motivo || '-'}</td>
                  <td>{inv.destino?.nombre || '-'}</td>
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

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-AR')
}

function formatTime(timeSpan) {
  if (!timeSpan) return ''
  const parts = timeSpan.split(':')
  return `${parts[0]}:${parts[1]}`
}
