import { useState } from 'react'
import { DataGrid } from '../components/DataGrid'

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'visitorFirstName', label: 'First Name' },
  { key: 'visitorLastName', label: 'Last Name' },
  { key: 'visitorDni', label: 'DNI' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
]

export function VisitasProgramadasPage({ scheduledVisits }) {
  const [filters, setFilters] = useState({
    firstName: '',
    lastName: '',
    status: '',
  })

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  const filtered = scheduledVisits.filter((visit) => {
    const matchFirstName = visit.visitorFirstName
      .toLowerCase()
      .includes(filters.firstName.toLowerCase())
    const matchLastName = visit.visitorLastName
      .toLowerCase()
      .includes(filters.lastName.toLowerCase())
    const matchStatus = visit.status
      .toLowerCase()
      .includes(filters.status.toLowerCase())

    return matchFirstName && matchLastName && matchStatus
  })

  return (
    <section className="dashboard-content visitors-view">
      <div className="content-header">
        <div className="dashboard-copy">
          <h1>Scheduled Visits</h1>
        </div>
      </div>

      <section className="filters-panel">
        <label className="field">
          <span>First Name</span>
          <input
            type="text"
            placeholder="Search by first name"
            value={filters.firstName}
            onChange={(event) => handleFilterChange('firstName', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Last Name</span>
          <input
            type="text"
            placeholder="Search by last name"
            value={filters.lastName}
            onChange={(event) => handleFilterChange('lastName', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Status</span>
          <input
            type="text"
            placeholder="Confirmed, Pending, Cancelled"
            value={filters.status}
            onChange={(event) => handleFilterChange('status', event.target.value)}
          />
        </label>
      </section>

      <section className="table-panel">
        <DataGrid
          columns={columns}
          rows={filtered}
          rowKey="id"
          emptyMessage="No scheduled visits found for the selected filters."
        />
      </section>
    </section>
  )
}
