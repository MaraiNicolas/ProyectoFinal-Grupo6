import { useState } from 'react'
import { useVisitorFilters } from '../hooks/useVisitorFilters'
import { DataGrid } from '../components/DataGrid'
import { Button } from '../components/Button'

export function VisitantesPage({
  visitors,
  onCreateVisitor,
  onEditVisitor,
  onDeleteVisitor,
}) {
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

        <Button variant="primary" onClick={onCreateVisitor}>
          Nuevo visitante
        </Button>
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
            { label: 'Modificar', onClick: () => onEditVisitor(visitor.id) },
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
