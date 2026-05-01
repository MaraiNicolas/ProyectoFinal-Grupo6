import { useVisitorFilters } from '../hooks/useVisitorFilters'
import { VisitorActionsMenu } from '../components/VisitorActionsMenu'

export function VisitantesPage() {
  const { filters, filteredVisitors, handleFilterChange } = useVisitorFilters()

  return (
    <section className="dashboard-content visitors-view">
      <div className="content-header">
        <div className="dashboard-copy">
          <h1>Visitantes registrados</h1>
        </div>

        <button type="button" className="primary-action-button">
          Nuevo visitante
        </button>
      </div>

      <section className="filters-panel">
        <label className="field">
          <span>Nombre</span>
          <input
            type="text"
            placeholder="Buscar por nombre"
            value={filters.nombre}
            onChange={(event) => handleFilterChange('nombre', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Apellido</span>
          <input
            type="text"
            placeholder="Buscar por apellido"
            value={filters.apellido}
            onChange={(event) => handleFilterChange('apellido', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Mail</span>
          <input
            type="text"
            placeholder="Buscar por mail"
            value={filters.mail}
            onChange={(event) => handleFilterChange('mail', event.target.value)}
          />
        </label>

        <label className="field">
          <span>DNI</span>
          <input
            type="text"
            placeholder="Buscar por DNI"
            value={filters.dni}
            onChange={(event) => handleFilterChange('dni', event.target.value)}
          />
        </label>
      </section>

      <section className="table-panel">
        <table className="visitors-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Mail</th>
              <th>DNI</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredVisitors.map((visitor) => (
              <tr key={visitor.id}>
                <td>{visitor.nombre}</td>
                <td>{visitor.apellido}</td>
                <td>{visitor.mail}</td>
                <td>{visitor.dni}</td>
                <td className="visitor-actions-cell">
                  <VisitorActionsMenu
                    visitorName={`${visitor.nombre} ${visitor.apellido}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredVisitors.length === 0 ? (
          <p className="empty-state">No se encontraron visitantes con esos filtros.</p>
        ) : null}
      </section>
    </section>
  )
}
