const API_URL = import.meta.env.VITE_API_URL || "https://localhost:7289/api";


function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    // Sin login local: el reingreso es desde Finnegans GO. Mostramos la pagina
    // de SSO sin token para que muestre el mensaje "Falta access_token".
    window.location.href = "/auth/sso";
    return;
  }

  if (response.status === 204) return null;
  return response.json();
}

// --- Auth (SSO Finnegans) ---
//
// El access_token recibido en la URL es el unico credencial de la sesion.
// El backend lo valida contra Finnegans y, si es OK, retorna los datos del
// usuario (sin emitir token propio). Guardamos el access_token tal cual y lo
// enviamos como Bearer en cada request posterior.
export async function ssoLogin(accessToken) {
  // Guardamos el token ANTES de la request: el handler del backend lo valida
  // contra Finnegans para responder /auth/sso. Si la validacion falla, el
  // catch limpia el localStorage.
  localStorage.setItem("token", accessToken);
  try {
    const data = await request(
      `/auth/sso?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (data?.usuario) {
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      return data;
    }
    // Backend respondio 200 pero sin usuario (caso teorico) -> tratamos como error
    localStorage.removeItem("token");
    return data;
  } catch (err) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    throw err;
  }
}

export async function logout() {
  const token = getToken();
  if (token) {
    // Best-effort: avisamos al backend para que invalide la entrada del cache.
    // No esperamos exito; si falla, el token sigue siendo aceptado hasta que
    // expire el TTL del cache (default 5 min).
    try {
      await fetch(
        `${API_URL}/auth/logout?access_token=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
    } catch {
      // ignorar
    }
  }
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

export function getUsuarioActual() {
  const raw = localStorage.getItem("usuario");
  return raw ? JSON.parse(raw) : null;
}

export function estaAutenticado() {
  return !!getToken();
}

// --- Invitaciones ---
export function obtenerInvitaciones(fecha) {
  const params = fecha ? `?fecha=${fecha}` : "";
  return request(`/invitaciones${params}`);
}

export function obtenerInvitacion(id) {
  return request(`/invitaciones/${id}`);
}

export function crearInvitacion(data) {
  return request("/invitaciones", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function cancelarInvitacion(id) {
  return request(`/invitaciones/${id}/cancelar`, { method: "PUT" });
}

export function cancelarVisitante(invitacionId, visitanteId) {
  return request(
    `/invitaciones/${invitacionId}/visitantes/${visitanteId}/cancelar`,
    { method: "PUT" },
  );
}

export function agregarVisitantes(invitacionId, visitantes) {
  return request(`/invitaciones/${invitacionId}/visitantes`, {
    method: "POST",
    body: JSON.stringify(visitantes),
  });
}

// --- Registro (public) ---
export function obtenerRegistro(token) {
  return request(`/registro/${token}`);
}

export function completarRegistro(token, data) {
  return request(`/registro/${token}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Visitantes ---
export function obtenerVisitantes(search, pagina = 1, tamano = 20) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("pagina", pagina);
  params.set("tamano", tamano);
  return request(`/visitantes?${params.toString()}`);
}

// --- Destinos ---
export function obtenerDestinos() {
  return request("/destinos");
}

export function crearDestino(data) {
  return request("/destinos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function actualizarDestino(id, data) {
  return request(`/destinos/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function eliminarDestino(id) {
  return request(`/destinos/${id}`, { method: "DELETE" });
}

// --- Admin ---
export function obtenerTodasInvitaciones() {
  return request("/admin/invitaciones");
}

export function obtenerUsuarios() {
  return request("/admin/usuarios");
}

export function crearUsuario(data) {
  return request("/admin/usuarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function actualizarUsuario(id, data) {
  return request(`/admin/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function eliminarUsuario(id) {
  return request(`/admin/usuarios/${id}`, { method: "DELETE" });
}

export function obtenerConfiguracion() {
  return request("/admin/configuracion");
}

export function actualizarConfiguracion(clave, valor) {
  return request(`/admin/configuracion/${clave}`, {
    method: "PUT",
    body: JSON.stringify({ valor }),
  });
}

export function obtenerAuditLogs(eventType, desde, hasta) {
  const params = new URLSearchParams();
  if (eventType) params.set("eventType", eventType);
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const query = params.toString();
  return request(`/admin/audit-logs${query ? `?${query}` : ""}`);
}
