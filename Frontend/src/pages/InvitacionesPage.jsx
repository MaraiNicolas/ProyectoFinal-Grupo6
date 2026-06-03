import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerInvitaciones } from '../services/api'
import { Button } from '../components/Button'

const QUICK_FILTERS = [
  { key: 'todas', label: 'Todas' },
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'proximo', label: 'El mes que viene' },
]

function getDateRange(key) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (key) {
    case 'hoy':
      return { desde: today, hasta: today }
    case 'semana': {
      const day = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((day + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { desde: monday, hasta: sunday }
    }
    case 'mes': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { desde: first, hasta: last }
    }
    case 'proximo': {
      const first = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      const last = new Date(today.getFullYear(), today.getMonth() + 2, 0)
      return { desde: first, hasta: last }
    }
    default:
      return null
  }
}

export function InvitacionesPage() {
  const navigate = useNavigate()
  const [invitaciones, setInvitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [quickFilter, setQuickFilter] = useState('todas')
  const [customDate, setCustomDate] = useState('')

  useEffect(() => {
    obtenerInvitaciones().then((data) => {
      setInvitaciones(data || [])
      setLoading(false)
    })
  }, [])

  const filtered = (() => {
    if (customDate) {
      const selected = new Date(customDate)
      selected.setHours(0, 0, 0, 0)
      return invitaciones.filter((inv) => {
        const fecha = new Date(inv.fecha)
        fecha.setHours(0, 0, 0, 0)
        return fecha.getTime() === selected.getTime()
      })
    }
    const range = getDateRange(quickFilter)
    if (!range) return invitaciones
    return invitaciones.filter((inv) => {
      const fecha = new Date(inv.fecha)
      fecha.setHours(0, 0, 0, 0)
      return fecha >= range.desde && fecha <= range.hasta
    })
  })()

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

      <section className="filters-panel" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {QUICK_FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={quickFilter === f.key && !customDate ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => { setQuickFilter(f.key); setCustomDate('') }}
          >
            {f.label}
          </Button>
        ))}
        <input
          type="date"
          value={customDate}
          onChange={(e) => { setCustomDate(e.target.value); setQuickFilter('') }}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(20,31,56,0.16)', fontSize: '0.85rem' }}
        />
      </section>

      <section className="table-panel">
        {loading ? (
          <p className="empty-state">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No hay invitaciones.</p>
        ) : (
          <table className="visitors-table">
            <thead>
              <tr>
                <th>Estado de formularios</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Titulo</th>
                <th>Motivo</th>
                <th>Destino</th>
                <th>Visitantes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.guid}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/invitaciones/${inv.guid}`)}
                >
                  <td>{estadoFormularios(inv)}</td>
                  <td>{formatDate(inv.fecha)}</td>
                  <td>{formatTime(inv.horaInicio)} - {formatTime(inv.horaFin)}</td>
                  <td>{inv.titulo || '-'}</td>
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

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-AR')
}

function formatTime(timeSpan) {
  if (!timeSpan) return ''
  const parts = timeSpan.split(':')
  return `${parts[0]}:${parts[1]}`
}
