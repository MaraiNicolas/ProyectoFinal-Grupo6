import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerVisitantes } from '../services/api'
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

        <Button variant="primary" onClick={() => navigate('/invitaciones/nueva')}>
          Nueva invitacion
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
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/invitaciones/nueva?email=${encodeURIComponent(v.email)}`)}
                    >
                      Re-invitar
                    </Button>
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
