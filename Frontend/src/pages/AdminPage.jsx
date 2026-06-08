import { useEffect, useState, useMemo } from 'react'
import {
  obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario,
  obtenerDestinos, crearDestino, actualizarDestino, eliminarDestino,
  obtenerConfiguracion, actualizarConfiguracion,
  obtenerAuditLogs, obtenerTodasInvitaciones, getUsuarioActual,
} from '../services/api'
import { Button } from '../components/Button'
import { estadoFormularios } from '../components/EstadoHelpers'

const TABS = ['Invitaciones', 'Usuarios', 'Destinos', 'Configuracion', 'Audit Logs']

function FilterChips({ filters, onRemove }) {
  const entries = Object.entries(filters).filter(([, v]) => v !== '' && v !== null)
  if (entries.length === 0) return null

  return (
    <div className="filter-chips">
      {entries.map(([key, value]) => (
        <span key={key} className="filter-chip">
          {key}: {value}
          <button type="button" className="filter-chip-x" onClick={() => onRemove(key)}>&times;</button>
        </span>
      ))}
    </div>
  )
}

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field
  return (
    <th className="sortable-th" onClick={() => onSort(field)}>
      {label}
      <span className="sort-arrow">{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
    </th>
  )
}

function useSort(defaultField, defaultDir = 'desc') {
  const [sortField, setSortField] = useState(defaultField)
  const [sortDir, setSortDir] = useState(defaultDir)

  const onSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sortFn = (data, getVal) => {
    return [...data].sort((a, b) => {
      const va = getVal(a, sortField)
      const vb = getVal(b, sortField)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }

  return { sortField, sortDir, onSort, sortFn }
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('Invitaciones')

  return (
    <section className="dashboard-content">
      <div className="dashboard-copy">
        <h1>Administracion</h1>
      </div>

      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Invitaciones' && <AdminInvitaciones />}
      {activeTab === 'Usuarios' && <AdminUsuarios />}
      {activeTab === 'Destinos' && <AdminDestinos />}
      {activeTab === 'Configuracion' && <AdminConfiguracion />}
      {activeTab === 'Audit Logs' && <AdminAuditLogs />}
    </section>
  )
}

function AdminInvitaciones() {
  const [invitaciones, setInvitaciones] = useState([])
  const [loading, setLoading] = useState(true)

  const usuario = getUsuarioActual()
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [userFilter, setUserFilter] = useState(usuario?.email || '')

  const { sortField, sortDir, onSort, sortFn } = useSort('fecha')

  useEffect(() => {
    obtenerTodasInvitaciones().then((data) => { setInvitaciones(data || []); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    let result = invitaciones

    if (userFilter) {
      result = result.filter(inv => {
        const name = inv.usuario ? `${inv.usuario.nombre} ${inv.usuario.apellido}`.toLowerCase() : ''
        const email = inv.usuario?.email?.toLowerCase() || ''
        return name.includes(userFilter.toLowerCase()) || email.includes(userFilter.toLowerCase())
      })
    }

    if (search) {
      const s = search.toLowerCase()
      result = result.filter(inv =>
        (inv.titulo || '').toLowerCase().includes(s) ||
        (inv.motivo || '').toLowerCase().includes(s) ||
        (inv.usuario ? `${inv.usuario.nombre} ${inv.usuario.apellido}` : '').toLowerCase().includes(s) ||
        (inv.usuario?.email || '').toLowerCase().includes(s) ||
        (inv.destino?.nombre || '').toLowerCase().includes(s)
      )
    }

    if (estado) {
      result = result.filter(inv => inv.estado === estado)
    }

    if (desde) {
      result = result.filter(inv => new Date(inv.fecha) >= new Date(desde))
    }

    if (hasta) {
      result = result.filter(inv => new Date(inv.fecha) <= new Date(hasta))
    }

    return sortFn(result, (inv, field) => {
      switch (field) {
        case 'estado': return inv.estado
        case 'fecha': return new Date(inv.fecha).getTime()
        case 'titulo': return inv.titulo || ''
        case 'motivo': return inv.motivo || ''
        case 'anfitrion': return inv.usuario ? `${inv.usuario.nombre} ${inv.usuario.apellido}` : ''
        case 'destino': return inv.destino?.nombre || ''
        case 'visitantes': return inv.visitantesCompletados || 0
        default: return ''
      }
    })
  }, [invitaciones, search, estado, desde, hasta, userFilter, sortField, sortDir, sortFn])

  const activeFilters = {}
  if (userFilter) activeFilters['Usuario'] = userFilter
  if (estado) activeFilters['Estado'] = estado
  if (desde) activeFilters['Desde'] = desde
  if (hasta) activeFilters['Hasta'] = hasta

  const removeFilter = (key) => {
    if (key === 'Usuario') setUserFilter('')
    if (key === 'Estado') setEstado('')
    if (key === 'Desde') setDesde('')
    if (key === 'Hasta') setHasta('')
  }

  if (loading) return <p className="empty-state">Cargando...</p>

  return (
    <div style={{ marginTop: 20 }}>
      <div className="filter-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="Buscar por titulo, motivo, anfitrion, destino..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input type="date" className="filter-input filter-date" value={desde} onChange={(e) => setDesde(e.target.value)} title="Desde" />
        <input type="date" className="filter-input filter-date" value={hasta} onChange={(e) => setHasta(e.target.value)} title="Hasta" />
        <select className="filter-select" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Activa">Activa</option>
          <option value="Cancelada">Cancelada</option>
          <option value="Expirada">Expirada</option>
        </select>
        <select className="filter-select" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
          <option value="">Todos los usuarios</option>
          {[...new Set(invitaciones.map(inv => inv.usuario?.email).filter(Boolean))].map(email => (
            <option key={email} value={email}>{email}</option>
          ))}
        </select>
      </div>

      <FilterChips filters={activeFilters} onRemove={removeFilter} />

      <section className="table-panel" style={{ overflowX: 'auto' }}>
        <table className="visitors-table">
          <thead>
            <tr>
              <SortHeader label="Estado de formularios" field="estado" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Fecha" field="fecha" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Titulo" field="titulo" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Motivo" field="motivo" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Anfitrion" field="anfitrion" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Destino" field="destino" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Visitantes" field="visitantes" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.guid}>
                <td>{estadoFormularios(inv)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(inv.fecha).toLocaleDateString('es-AR')}</td>
                <td>{inv.titulo || '-'}</td>
                <td>{inv.motivo || '-'}</td>
                <td>{inv.usuario ? `${inv.usuario.nombre} ${inv.usuario.apellido}` : '-'}</td>
                <td>{inv.destino?.nombre || '-'}</td>
                <td>{inv.visitantesCompletados}/{inv.cantidadVisitantes}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No se encontraron invitaciones</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', rol: 'Empleado' })
  const [search, setSearch] = useState('')

  const { sortField, sortDir, onSort, sortFn } = useSort('nombre', 'asc')

  const load = () => obtenerUsuarios().then((data) => { setUsuarios(data || []); setLoading(false) })
  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (editingId) await actualizarUsuario(editingId, form)
    else await crearUsuario(form)
    setShowForm(false); setEditingId(null); setForm({ nombre: '', apellido: '', email: '', rol: 'Empleado' })
    load()
  }

  const handleEdit = (u) => {
    setForm({ nombre: u.nombre, apellido: u.apellido, email: u.email, rol: u.rol })
    setEditingId(u.guid); setShowForm(true)
  }

  const handleDelete = async (id) => { await eliminarUsuario(id); load() }

  const filtered = useMemo(() => {
    let result = usuarios
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(u =>
        u.nombre.toLowerCase().includes(s) ||
        u.apellido.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.rol.toLowerCase().includes(s)
      )
    }
    return sortFn(result, (u, field) => {
      switch (field) {
        case 'nombre': return u.nombre
        case 'apellido': return u.apellido
        case 'email': return u.email
        case 'rol': return u.rol
        default: return ''
      }
    })
  }, [usuarios, search, sortField, sortDir, sortFn])

  if (loading) return <p className="empty-state">Cargando...</p>

  return (
    <div style={{ marginTop: 20 }}>
      <div className="filter-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="Buscar por nombre, apellido, email, rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="primary"
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: '', apellido: '', email: '', rol: 'Empleado' }) }}>
          Nuevo usuario
        </Button>
      </div>

      {showForm ? (
        <section className="table-panel" style={{ marginBottom: 20 }}>
          <form className="visitor-form" onSubmit={handleSave}>
            <label className="field"><span>Nombre</span><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></label>
            <label className="field"><span>Apellido</span><input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required /></label>
            <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label className="field"><span>Rol</span>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className="field-select">
                <option value="Admin">Admin</option>
                <option value="Empleado">Empleado</option>
              </select>
            </label>
            <div className="visitor-form-actions">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="primary" type="submit">{editingId ? 'Guardar' : 'Crear'}</Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="table-panel">
        <table className="visitors-table">
          <thead>
            <tr>
              <SortHeader label="Nombre" field="nombre" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Apellido" field="apellido" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Email" field="email" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Rol" field="rol" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.guid}>
                <td>{u.nombre}</td><td>{u.apellido}</td><td>{u.email}</td><td>{u.rol}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(u)}>Editar</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(u.guid)}>Eliminar</Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No se encontraron usuarios</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function AdminDestinos() {
  const [destinos, setDestinos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })

  const load = () => obtenerDestinos().then((data) => { setDestinos(data || []); setLoading(false) })
  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (editingId) await actualizarDestino(editingId, form)
    else await crearDestino(form)
    setShowForm(false); setEditingId(null); setForm({ nombre: '', descripcion: '' })
    load()
  }

  const handleEdit = (d) => {
    setForm({ nombre: d.nombre, descripcion: d.descripcion || '' })
    setEditingId(d.guid); setShowForm(true)
  }

  const handleDelete = async (id) => { await eliminarDestino(id); load() }

  if (loading) return <p className="empty-state">Cargando...</p>

  return (
    <div style={{ marginTop: 20 }}>
      <Button variant="primary" style={{ marginBottom: 16 }}
        onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: '', descripcion: '' }) }}>
        Nuevo destino
      </Button>

      {showForm ? (
        <section className="table-panel" style={{ marginBottom: 20 }}>
          <form className="visitor-form" onSubmit={handleSave}>
            <label className="field"><span>Nombre</span><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej: Piso 6" /></label>
            <label className="field"><span>Descripcion</span><input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Sala de conferencias" /></label>
            <div className="visitor-form-actions">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="primary" type="submit">{editingId ? 'Guardar' : 'Crear'}</Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="table-panel">
        <table className="visitors-table">
          <thead><tr><th>Nombre</th><th>Descripcion</th><th>Acciones</th></tr></thead>
          <tbody>
            {destinos.map((d) => (
              <tr key={d.guid}>
                <td>{d.nombre}</td><td>{d.descripcion || '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(d)}>Editar</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(d.guid)}>Eliminar</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function AdminConfiguracion() {
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    obtenerConfiguracion().then((data) => { setConfigs(data || []); setLoading(false) })
  }, [])

  const handleSave = async (clave) => {
    await actualizarConfiguracion(clave, editValue)
    setEditingKey(null)
    obtenerConfiguracion().then((data) => setConfigs(data || []))
  }

  if (loading) return <p className="empty-state">Cargando...</p>

  return (
    <section className="table-panel" style={{ marginTop: 20 }}>
      <table className="visitors-table">
        <thead><tr><th>Clave</th><th>Valor</th><th>Descripcion</th><th>Acciones</th></tr></thead>
        <tbody>
          {configs.map((c) => (
            <tr key={c.clave}>
              <td><strong>{c.clave}</strong></td>
              <td>
                {editingKey === c.clave ? (
                  <input value={editValue} onChange={(e) => setEditValue(e.target.value)} style={{ padding: '8px', borderRadius: 8, border: '1px solid rgba(20,31,56,0.16)' }} />
                ) : c.valor}
              </td>
              <td>{c.descripcion || '-'}</td>
              <td>
                {editingKey === c.clave ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="primary" size="sm" onClick={() => handleSave(c.clave)}>Guardar</Button>
                    <Button variant="secondary" size="sm" onClick={() => setEditingKey(null)}>Cancelar</Button>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm"
                    onClick={() => { setEditingKey(c.clave); setEditValue(c.valor) }}>Editar</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function AdminAuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [eventType, setEventType] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const { sortField, sortDir, onSort, sortFn } = useSort('timestamp')

  useEffect(() => {
    obtenerAuditLogs().then((data) => { setLogs(data || []); setLoading(false) })
  }, [])

  const eventTypes = useMemo(() =>
    [...new Set(logs.map(l => l.eventType).filter(Boolean))].sort(),
    [logs]
  )

  const filtered = useMemo(() => {
    let result = logs

    if (search) {
      const s = search.toLowerCase()
      result = result.filter(l =>
        (l.usuarioEmail || '').toLowerCase().includes(s) ||
        (l.visitanteEmail || '').toLowerCase().includes(s) ||
        (l.invitacionTitulo || '').toLowerCase().includes(s) ||
        (l.eventType || '').toLowerCase().includes(s)
      )
    }

    if (eventType) {
      result = result.filter(l => l.eventType === eventType)
    }

    if (desde) {
      result = result.filter(l => new Date(l.timestamp) >= new Date(desde))
    }

    if (hasta) {
      const hastaEnd = new Date(hasta)
      hastaEnd.setHours(23, 59, 59, 999)
      result = result.filter(l => new Date(l.timestamp) <= hastaEnd)
    }

    return sortFn(result, (l, field) => {
      switch (field) {
        case 'eventType': return l.eventType
        case 'timestamp': return new Date(l.timestamp).getTime()
        case 'usuarioEmail': return l.usuarioEmail || ''
        case 'visitanteEmail': return l.visitanteEmail || ''
        case 'invitacionTitulo': return l.invitacionTitulo || ''
        default: return ''
      }
    })
  }, [logs, search, eventType, desde, hasta, sortField, sortDir, sortFn])

  const activeFilters = {}
  if (eventType) activeFilters['Evento'] = eventType
  if (desde) activeFilters['Desde'] = desde
  if (hasta) activeFilters['Hasta'] = hasta

  const removeFilter = (key) => {
    if (key === 'Evento') setEventType('')
    if (key === 'Desde') setDesde('')
    if (key === 'Hasta') setHasta('')
  }

  if (loading) return <p className="empty-state">Cargando...</p>

  return (
    <div style={{ marginTop: 20 }}>
      <div className="filter-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="Buscar por email, titulo, evento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input type="date" className="filter-input filter-date" value={desde} onChange={(e) => setDesde(e.target.value)} title="Desde" />
        <input type="date" className="filter-input filter-date" value={hasta} onChange={(e) => setHasta(e.target.value)} title="Hasta" />
        <select className="filter-select" value={eventType} onChange={(e) => setEventType(e.target.value)}>
          <option value="">Todos los eventos</option>
          {eventTypes.map(et => (
            <option key={et} value={et}>{et}</option>
          ))}
        </select>
      </div>

      <FilterChips filters={activeFilters} onRemove={removeFilter} />

      <section className="table-panel" style={{ overflowX: 'auto' }}>
        <table className="visitors-table">
          <thead>
            <tr>
              <SortHeader label="Evento" field="eventType" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Fecha" field="timestamp" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Usuario" field="usuarioEmail" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Visitante" field="visitanteEmail" sortField={sortField} sortDir={sortDir} onSort={onSort} />
              <SortHeader label="Evento (Titulo)" field="invitacionTitulo" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.guid}>
                <td><strong>{log.eventType}</strong></td>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString('es-AR')}</td>
                <td>{log.usuarioEmail || '-'}</td>
                <td>{log.visitanteEmail || '-'}</td>
                <td>{log.invitacionTitulo || '-'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No se encontraron logs</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
