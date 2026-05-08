import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerVisitantes } from '../services/api'

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
    </section>
  )
}
