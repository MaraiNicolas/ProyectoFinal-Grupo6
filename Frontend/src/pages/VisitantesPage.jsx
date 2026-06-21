import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerVisitantes, obtenerInvitaciones, agregarVisitantes, eliminarVisitante, obtenerGrupos, obtenerGrupo, actualizarGrupo, eliminarGrupo } from '../services/api'
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
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const menuRef = useRef(null)

  const [activeTab, setActiveTab] = useState('individual')
  const [grupos, setGrupos] = useState([])
  const [loadingGrupos, setLoadingGrupos] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', miembros: [] })
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(null)

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
    if (activeTab === 'grupos' && grupos.length === 0) {
      setLoadingGrupos(true)
      obtenerGrupos().then((data) => {
        setGrupos(data || [])
        setLoadingGrupos(false)
      })
    }
  }, [activeTab])

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

  const handleDeleteVisitante = async () => {
    if (!deleteConfirm) return
    await eliminarVisitante(deleteConfirm.guid)
    setDeleteConfirm(null)
    setVisitantes((current) => current.filter((v) => v.guid !== deleteConfirm.guid))
  }

  const openEditGroup = async (grupo) => {
    const detail = await obtenerGrupo(grupo.guid)
    setEditForm({ nombre: detail.nombre, descripcion: detail.descripcion || '', miembros: detail.miembros || [] })
    setEditingGroup(detail)
  }

  const handleEditMemberChange = (index, field, value) => {
    setEditForm((f) => ({ ...f, miembros: f.miembros.map((m, i) => i === index ? { ...m, [field]: value } : m) }))
  }

  const handleSaveGroup = async () => {
    const validMembers = editForm.miembros.filter((m) => m.email.trim())
    if (!editForm.nombre.trim() || validMembers.length === 0) return
    await actualizarGrupo(editingGroup.guid, { nombre: editForm.nombre, descripcion: editForm.descripcion, miembros: validMembers })
    setEditingGroup(null)
    obtenerGrupos().then((data) => setGrupos(data || []))
  }

  const handleDeleteGroup = async () => {
    if (!deleteGroupConfirm) return
    await eliminarGrupo(deleteGroupConfirm.guid)
    setDeleteGroupConfirm(null)
    setGrupos((current) => current.filter((g) => g.guid !== deleteGroupConfirm.guid))
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

      <div className="admin-tabs" style={{ marginBottom: 16 }}>
        <button className={`admin-tab ${activeTab === 'individual' ? 'active' : ''}`} onClick={() => setActiveTab('individual')}>Individual</button>
        <button className={`admin-tab ${activeTab === 'grupos' ? 'active' : ''}`} onClick={() => setActiveTab('grupos')}>Grupos</button>
      </div>

      {activeTab === 'individual' && (
        <>
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
                        <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setMenuOpen(menuOpen === v.guid ? null : v.guid)}
                          >
                            Re-invitar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteConfirm(v)}
                          >
                            Eliminar
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

          {deleteConfirm && (
            <div className="confirm-overlay" onClick={() => setDeleteConfirm(null)}>
              <section className="confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <h2>Eliminar visitante</h2>
                <p>Estas seguro que deseas eliminar a <strong>{deleteConfirm.nombre} {deleteConfirm.apellido}</strong> ({deleteConfirm.email})?</p>
                <div className="confirm-actions">
                  <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>No</Button>
                  <Button variant="danger" onClick={handleDeleteVisitante}>Si, eliminar</Button>
                </div>
              </section>
            </div>
          )}

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
        </>
      )}

      {activeTab === 'grupos' && (
        <>
          <section className="table-panel">
            {loadingGrupos ? (
              <p className="empty-state">Cargando...</p>
            ) : grupos.length === 0 ? (
              <p className="empty-state">No hay grupos creados.</p>
            ) : (
              <table className="visitors-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripcion</th>
                    <th>Miembros</th>
                    <th>Creado por</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((g) => (
                    <tr key={g.guid}>
                      <td>{g.nombre}</td>
                      <td>{g.descripcion || '-'}</td>
                      <td>{g.cantidadMiembros}</td>
                      <td>{g.creadoPor}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button variant="secondary" size="sm" onClick={() => openEditGroup(g)}>Ver/Editar</Button>
                          <Button variant="primary" size="sm" onClick={() => navigate(`/invitaciones/nueva?grupoId=${g.guid}`)}>Crear invitacion</Button>
                          <Button variant="danger" size="sm" onClick={() => setDeleteGroupConfirm(g)}>Eliminar</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {deleteGroupConfirm && (
            <div className="confirm-overlay" onClick={() => setDeleteGroupConfirm(null)}>
              <section className="confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <h2>Eliminar grupo</h2>
                <p>Estas seguro que deseas eliminar el grupo <strong>{deleteGroupConfirm.nombre}</strong>?</p>
                <div className="confirm-actions">
                  <Button variant="secondary" onClick={() => setDeleteGroupConfirm(null)}>No</Button>
                  <Button variant="danger" onClick={handleDeleteGroup}>Si, eliminar</Button>
                </div>
              </section>
            </div>
          )}

          {editingGroup && (
            <div className="confirm-overlay" onClick={() => setEditingGroup(null)}>
              <section className="confirm-modal picker-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <h2>Editar grupo</h2>
                <label className="field">
                  <span>Nombre</span>
                  <input type="text" value={editForm.nombre} onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))} />
                </label>
                <label className="field" style={{ marginTop: 8 }}>
                  <span>Descripcion</span>
                  <input type="text" value={editForm.descripcion} onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))} />
                </label>
                <h3 style={{ marginTop: 16, marginBottom: 8 }}>Miembros</h3>
                {editForm.miembros.map((m, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                    <label className="field" style={{ marginBottom: 0 }}>
                      <span>Email</span>
                      <input type="email" value={m.email} onChange={(e) => handleEditMemberChange(i, 'email', e.target.value)} />
                    </label>
                    <label className="field" style={{ marginBottom: 0 }}>
                      <span>Telefono</span>
                      <input type="tel" value={m.telefono || ''} onChange={(e) => handleEditMemberChange(i, 'telefono', e.target.value)} />
                    </label>
                    {editForm.miembros.length > 1 && (
                      <Button variant="danger" size="sm" onClick={() => setEditForm((f) => ({ ...f, miembros: f.miembros.filter((_, j) => j !== i) }))}>Quitar</Button>
                    )}
                  </div>
                ))}
                <Button variant="secondary" size="sm" onClick={() => setEditForm((f) => ({ ...f, miembros: [...f.miembros, { email: '', telefono: '' }] }))}>Agregar miembro</Button>
                <div className="confirm-actions" style={{ marginTop: 16 }}>
                  <Button variant="secondary" onClick={() => setEditingGroup(null)}>Cancelar</Button>
                  <Button variant="primary" onClick={handleSaveGroup}>Guardar</Button>
                </div>
              </section>
            </div>
          )}
        </>
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
