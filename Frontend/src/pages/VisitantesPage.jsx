import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerVisitantes } from '../services/api'
import { useVisitorFilters } from '../hooks/useVisitorFilters'
import { DataGrid } from '../components/DataGrid'
import { Button } from '../components/Button'

export function VisitantesPage() {
  const navigate = useNavigate()
  const [visitantes, setVisitantes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

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

  return (
    <section className="dashboard-content visitors-view">
      <div className="content-header">
        <div className="dashboard-copy">
          <h1>Historial de Visitantes</h1>
        </div>

        <Button variant="primary" onClick={onCreateVisitor}>
          Nuevo visitante
        </Button>
      </div>

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
                    <button
                      type="button"
                      className="secondary-action-button"
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      onClick={() => navigate('/invitaciones/nueva')}
                    >
                      Re-invitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {visitorToDelete ? (
        <div className="confirm-overlay" onClick={() => setVisitorToDelete(null)}>
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-visitor-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-visitor-title">Eliminar registro</h2>
            <p>
              Estas seguro que deseas eliminar a
              {' '}
              <strong>{visitorToDelete.nombre} {visitorToDelete.apellido}</strong>
              ?
            </p>

            <div className="confirm-actions">
              <Button variant="secondary" onClick={() => setVisitorToDelete(null)}>
                No
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete}>
                Si, eliminar
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
