import { useEffect, useState } from 'react'
import {
  obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario,
  obtenerDestinos, crearDestino, actualizarDestino, eliminarDestino,
  obtenerConfiguracion, actualizarConfiguracion,
  obtenerAuditLogs, obtenerInvitaciones,
} from '../services/api'

const TABS = ['Invitaciones', 'Usuarios', 'Destinos', 'Configuracion', 'Audit Logs']

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

  useEffect(() => {
    obtenerInvitaciones().then((data) => { setInvitaciones(data || []); setLoading(false) })
  }, [])

  if (loading) return <p className="empty-state">Cargando...</p>

  return (
    <section className="table-panel" style={{ marginTop: 20 }}>
      <table className="visitors-table">
        <thead>
          <tr>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Motivo</th>
            <th>Anfitrion</th>
            <th>Destino</th>
            <th>Visitantes</th>
          </tr>
        </thead>
        <tbody>
          {invitaciones.map((inv) => (
            <tr key={inv.guid}>
              <td><span className={`status-badge status-${inv.estado.toLowerCase()}`}>{inv.estado}</span></td>
              <td>{new Date(inv.fecha).toLocaleDateString('es-AR')}</td>
              <td>{inv.motivo || '-'}</td>
              <td>{inv.usuario ? `${inv.usuario.nombre} ${inv.usuario.apellido}` : '-'}</td>
              <td>{inv.destino?.nombre || '-'}</td>
              <td>{inv.visitantesCompletados}/{inv.cantidadVisitantes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', rol: 'Empleado' })

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

  if (loading) return <p className="empty-state">Cargando...</p>

  return (
    <div style={{ marginTop: 20 }}>
      <button type="button" className="primary-action-button" style={{ marginBottom: 16 }}
        onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: '', apellido: '', email: '', rol: 'Empleado' }) }}>
        Nuevo usuario
      </button>

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
              <button type="button" className="secondary-action-button" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="primary-action-button">{editingId ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="table-panel">
        <table className="visitors-table">
          <thead><tr><th>Nombre</th><th>Apellido</th><th>Email</th><th>Rol</th><th>Acciones</th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.guid}>
                <td>{u.nombre}</td><td>{u.apellido}</td><td>{u.email}</td><td>{u.rol}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="secondary-action-button" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => handleEdit(u)}>Editar</button>
                    <button type="button" className="danger-action-button" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => handleDelete(u.guid)}>Eliminar</button>
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
      <button type="button" className="primary-action-button" style={{ marginBottom: 16 }}
        onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: '', descripcion: '' }) }}>
        Nuevo destino
      </button>

      {showForm ? (
        <section className="table-panel" style={{ marginBottom: 20 }}>
          <form className="visitor-form" onSubmit={handleSave}>
            <label className="field"><span>Nombre</span><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej: Piso 6" /></label>
            <label className="field"><span>Descripcion</span><input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Sala de conferencias" /></label>
            <div className="visitor-form-actions">
              <button type="button" className="secondary-action-button" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="primary-action-button">{editingId ? 'Guardar' : 'Crear'}</button>
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
                    <button type="button" className="secondary-action-button" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => handleEdit(d)}>Editar</button>
                    <button type="button" className="danger-action-button" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => handleDelete(d.guid)}>Eliminar</button>
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
                    <button type="button" className="primary-action-button" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => handleSave(c.clave)}>Guardar</button>
                    <button type="button" className="secondary-action-button" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => setEditingKey(null)}>Cancelar</button>
                  </div>
                ) : (
                  <button type="button" className="secondary-action-button" style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    onClick={() => { setEditingKey(c.clave); setEditValue(c.valor) }}>Editar</button>
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

  useEffect(() => {
    obtenerAuditLogs().then((data) => { setLogs(data || []); setLoading(false) })
  }, [])

  if (loading) return <p className="empty-state">Cargando...</p>

  return (
    <section className="table-panel" style={{ marginTop: 20 }}>
      <table className="visitors-table">
        <thead><tr><th>Evento</th><th>Fecha</th><th>Usuario</th><th>Visitante</th><th>Invitacion</th></tr></thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.guid}>
              <td><strong>{log.eventType}</strong></td>
              <td>{new Date(log.timestamp).toLocaleString('es-AR')}</td>
              <td>{log.usuarioId || '-'}</td>
              <td>{log.visitanteId || '-'}</td>
              <td>{log.invitacionId ? log.invitacionId.substring(0, 8) + '...' : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
