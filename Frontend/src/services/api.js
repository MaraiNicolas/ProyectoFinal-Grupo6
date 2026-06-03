const API_URL = 'https://localhost:7289/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = '/login'
    return
  }

  if (response.status === 204) return null
  return response.json()
}

// --- Auth ---
export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (data?.token) {
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
  }
  return data
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
}

export function getUsuarioActual() {
  const raw = localStorage.getItem('usuario')
  return raw ? JSON.parse(raw) : null
}

export function estaAutenticado() {
  return !!getToken()
}

// --- Invitaciones ---
export function obtenerInvitaciones(fecha) {
  const params = fecha ? `?fecha=${fecha}` : ''
  return request(`/invitaciones${params}`)
}

export function obtenerInvitacion(id) {
  return request(`/invitaciones/${id}`)
}

export function crearInvitacion(data) {
  return request('/invitaciones', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function cancelarInvitacion(id) {
  return request(`/invitaciones/${id}/cancelar`, { method: 'PUT' })
}

export function cancelarVisitante(invitacionId, visitanteId) {
  return request(`/invitaciones/${invitacionId}/visitantes/${visitanteId}/cancelar`, { method: 'PUT' })
}

export function agregarVisitantes(invitacionId, visitantes) {
  return request(`/invitaciones/${invitacionId}/visitantes`, {
    method: 'POST',
    body: JSON.stringify(visitantes),
  })
}

// --- Registro (public) ---
export function obtenerRegistro(token) {
  return request(`/registro/${token}`)
}

export function completarRegistro(token, data) {
  return request(`/registro/${token}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// --- Visitantes ---
export function obtenerVisitantes(search) {
  const params = search ? `?search=${encodeURIComponent(search)}` : ''
  return request(`/visitantes${params}`)
}

// --- Destinos ---
export function obtenerDestinos() {
  return request('/destinos')
}

export function crearDestino(data) {
  return request('/destinos', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function actualizarDestino(id, data) {
  return request(`/destinos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function eliminarDestino(id) {
  return request(`/destinos/${id}`, { method: 'DELETE' })
}

// --- Admin ---
export function obtenerTodasInvitaciones() {
  return request('/admin/invitaciones')
}

export function obtenerUsuarios() {
  return request('/admin/usuarios')
}

export function crearUsuario(data) {
  return request('/admin/usuarios', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function actualizarUsuario(id, data) {
  return request(`/admin/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function eliminarUsuario(id) {
  return request(`/admin/usuarios/${id}`, { method: 'DELETE' })
}

export function obtenerConfiguracion() {
  return request('/admin/configuracion')
}

export function actualizarConfiguracion(clave, valor) {
  return request(`/admin/configuracion/${clave}`, {
    method: 'PUT',
    body: JSON.stringify({ valor }),
  })
}

export function obtenerAuditLogs(eventType, desde, hasta) {
  const params = new URLSearchParams()
  if (eventType) params.set('eventType', eventType)
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  const query = params.toString()
  return request(`/admin/audit-logs${query ? `?${query}` : ''}`)
}
