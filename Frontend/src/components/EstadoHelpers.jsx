export function estadoFormularios(inv) {
  if (inv.estado === 'Cancelada') {
    return <span className="status-badge status-cancelada">Cancelada</span>
  }
  if (inv.estado === 'Expirada') {
    return <span className="status-badge status-expirada">Evento expirado</span>
  }
  const total = inv.cantidadVisitantes ?? inv.visitantes?.length ?? 0
  const completados = inv.visitantesCompletados ?? inv.visitantes?.filter((v) => v.estadoFormulario === 'Completado').length ?? 0
  const pendientes = total - completados
  if (pendientes === 0 && total > 0) {
    return <span className="status-badge status-activa">Completados</span>
  }
  return <span className="status-badge status-pendiente">{pendientes} pendientes</span>
}

export function estadoVisitante(v) {
  if (v.estadoFormulario === 'Completado') {
    return <span className="status-badge status-activa">Completado</span>
  }
  if (v.estadoFormulario === 'Cancelado') {
    return <span className="status-badge status-cancelada">Cancelado</span>
  }
  return <span className="status-badge status-pendiente">Pendiente</span>
}
