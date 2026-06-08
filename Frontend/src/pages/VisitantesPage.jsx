import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerVisitantes, obtenerInvitaciones, agregarVisitantes } from '../services/api'
import { Button } from '../components/Button'

export function VisitantesPage() {
  const navigate = useNavigate()
  const [visitantes, setVisitantes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [menuOpen, setMenuOpen] = useState(null)
  const [pickingFor, setPickingFor] = useState(null)
  const [invitaciones, setInvitaciones] = useState([])
  const [loadingInvitaciones, setLoadingInvitaciones] = useState(false)
  const [addSuccess, setAddSuccess] = useState(null)
  const [addError, setAddError] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      obtenerVisitantes(search || undefined).then((data) => {
        setVisitantes(data || [])
        setLoading(false)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(null)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const openPicker = (visitante) => {
    setMenuOpen(null)
    setPickingFor(visitante)
    setLoadingInvitaciones(true)
    setAddError(null)
    obtenerInvitaciones().then((data) => {
      const activas = (data || []).filter((inv) =>
        inv.estado === 'Pendiente' || inv.estado === 'Activa'
      )
      setInvitaciones(activas)
      setLoadingInvitaciones(false)
    })
  }

  const handleAddToInvitacion = async (invitacionId) => {
    setAddError(null)
    try {
      await agregarVisitantes(invitacionId, [{ email: pickingFor.email, telefono: pickingFor.telefono || '' }])
      setPickingFor(null)
      setAddSuccess(pickingFor.email)
      setTimeout(() => setAddSuccess(null), 3000)
    } catch {
      setAddError('Error al agregar visitante a la invitacion.')
    }
  }

  return (
    <section className="dashboard-content visitors-view">
      <div className="content-header">
        <div className="dashboard-copy">
          <h1>Historial de Visitantes</h1>
        </div>

        <Button variant="primary" onClick={() => navigate('/invitaciones/nueva')}>
          Nueva invitacion
        </Button>
      </div>

      {addSuccess && (
        <div className="success-toast">Visitante {addSuccess} agregado a la invitacion.</div>
      )}

      <section className="filters-panel">
        <label className="field">
          <span>Buscar</span>
          <input
            type="text"
            placeholder="Nombre, email o documento"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </section>

      <section className="table-panel">
        {loading ? (
          <p className="empty-state">Cargando...</p>
        ) : visitantes.length === 0 ? (
          <p className="empty-state">No se encontraron visitantes.</p>
        ) : (
          <table className="visitors-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Email</th>
                <th>Telefono</th>
                <th>Documento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visitantes.map((v) => (
                <tr key={v.guid}>
                  <td>{v.nombre}</td>
                  <td>{v.apellido}</td>
                  <td>{v.email}</td>
                  <td>{v.telefono || '-'}</td>
                  <td>{v.tipoDocumento} {v.numeroDocumento}</td>
                  <td>
                    <div style={{ position: 'relative' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setMenuOpen(menuOpen === v.guid ? null : v.guid)}
                      >
                        Re-invitar
                      </Button>
                      {menuOpen === v.guid && (
                        <div className="reinvite-menu" ref={menuRef}>
                          <button
                            className="reinvite-menu-item"
                            onClick={() => openPicker(v)}
                          >
                            Agregar a evento existente
                          </button>
                          <button
                            className="reinvite-menu-item"
                            onClick={() => navigate(`/invitaciones/nueva?email=${encodeURIComponent(v.email)}`)}
                          >
                            Crear nuevo evento
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {pickingFor && (
        <div className="confirm-overlay" onClick={() => setPickingFor(null)}>
          <section className="confirm-modal picker-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Agregar a evento existente</h2>
            <p style={{ marginBottom: 16 }}>
              Selecciona una invitacion para agregar a <strong>{pickingFor.nombre} {pickingFor.apellido}</strong> ({pickingFor.email})
            </p>

            {addError && <p className="login-error">{addError}</p>}

            {loadingInvitaciones ? (
              <p className="empty-state">Cargando invitaciones...</p>
            ) : invitaciones.length === 0 ? (
              <p className="empty-state">No hay invitaciones activas.</p>
            ) : (
              <div className="picker-list">
                {invitaciones.map((inv) => (
                  <button
                    key={inv.guid}
                    className="picker-item"
                    onClick={() => handleAddToInvitacion(inv.guid)}
                  >
                    <div className="picker-item-title">{inv.titulo}</div>
                    <div className="picker-item-details">
                      <span>{formatDate(inv.fecha)}</span>
                      <span>{formatTime(inv.horaInicio)} - {formatTime(inv.horaFin)}</span>
                      <span>{inv.destino?.nombre}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="confirm-actions" style={{ marginTop: 16 }}>
              <Button variant="secondary" onClick={() => setPickingFor(null)}>Cancelar</Button>
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
