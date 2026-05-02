import { useState } from 'react'
import { useVisitorFilters } from '../hooks/useVisitorFilters'
import { DataGrid } from '../components/DataGrid'

export function VisitantesPage({ visitors, onCreateVisitor, onDeleteVisitor }) {
  const { filters, filteredVisitors, handleFilterChange } = useVisitorFilters(visitors)
  const [visitorToDelete, setVisitorToDelete] = useState(null)
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'mail', label: 'Mail' },
    { key: 'dni', label: 'DNI' },
  ]

  const handleConfirmDelete = () => {
    if (!visitorToDelete) return
    onDeleteVisitor(visitorToDelete.id)
    setVisitorToDelete(null)
  }

  return (
    <section className="dashboard-content visitors-view">
      <div className="content-header">
        <div className="dashboard-copy">
          <h1>Visitantes registrados</h1>
        </div>

        <button type="button" className="primary-action-button" onClick={onCreateVisitor}>
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
        <DataGrid
          columns={columns}
          rows={filteredVisitors}
          rowKey="id"
          actions={(visitor) => [
            { label: 'Invitar', onClick: () => {} },
            { label: 'Modificar', onClick: () => {} },
            {
              label: 'Eliminar',
              onClick: () => setVisitorToDelete(visitor),
              danger: true,
            },
          ]}
          emptyMessage="No se encontraron visitantes con esos filtros."
        />
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
              <button
                type="button"
                className="secondary-action-button"
                onClick={() => setVisitorToDelete(null)}
              >
                No
              </button>
              <button
                type="button"
                className="danger-action-button"
                onClick={handleConfirmDelete}
              >
                Si, eliminar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
