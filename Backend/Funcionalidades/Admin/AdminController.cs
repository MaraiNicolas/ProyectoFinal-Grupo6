using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProyectoFinal_Grupo6.Api.Dominio.Interfaces.Servicios;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Admin
{
    [ApiController]
    [Route("api/admin")]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly AdminService _service;
        private readonly IHikCentralService _hikCentral;

        public AdminController(AdminService service, IHikCentralService hikCentral)
        {
            _service = service;
            _hikCentral = hikCentral;
        }

        // --- Usuarios ---

        [HttpGet("usuarios")]
        public async Task<IActionResult> ListarUsuarios()
        {
            var usuarios = await _service.ObtenerUsuarios();
            return Ok(usuarios.Select(u => new { u.Guid, u.Nombre, u.Apellido, u.Email, u.Rol }));
        }

        [HttpPost("usuarios")]
        public async Task<IActionResult> CrearUsuario([FromBody] CrearUsuarioRequest request)
        {
            var usuario = await _service.CrearUsuario(request);
            return CreatedAtAction(nameof(ListarUsuarios), null, new { usuario.Guid, usuario.Nombre, usuario.Apellido, usuario.Email, usuario.Rol });
        }

        [HttpPut("usuarios/{id}")]
        public async Task<IActionResult> ActualizarUsuario(Guid id, [FromBody] CrearUsuarioRequest request)
        {
            var usuario = await _service.ActualizarUsuario(id, request);
            if (usuario == null)
                return NotFound(new { mensaje = "Usuario no encontrado" });

            return Ok(new { usuario.Guid, usuario.Nombre, usuario.Apellido, usuario.Email, usuario.Rol });
        }

        [HttpDelete("usuarios/{id}")]
        public async Task<IActionResult> EliminarUsuario(Guid id)
        {
            var eliminado = await _service.EliminarUsuario(id);
            if (!eliminado)
                return NotFound(new { mensaje = "Usuario no encontrado" });

            return NoContent();
        }

        // --- Configuracion ---

        [HttpGet("configuracion")]
        public async Task<IActionResult> ListarConfiguracion()
        {
            var configs = await _service.ObtenerConfiguracion();
            return Ok(configs.Select(c => new { c.Clave, c.Valor, c.Descripcion }));
        }

        [HttpPut("configuracion/{clave}")]
        public async Task<IActionResult> ActualizarConfiguracion(string clave, [FromBody] ActualizarConfiguracionRequest request)
        {
            var config = await _service.ActualizarConfiguracion(clave, request.Valor);
            if (config == null)
                return NotFound(new { mensaje = "Configuracion no encontrada" });

            return Ok(new { config.Clave, config.Valor, config.Descripcion });
        }

        // --- Audit Logs ---

        [HttpGet("audit-logs")]
        public async Task<IActionResult> ListarAuditLogs(
            [FromQuery] string? eventType,
            [FromQuery] DateTime? desde,
            [FromQuery] DateTime? hasta)
        {
            var logs = await _service.ObtenerAuditLogs(eventType, desde, hasta);
            return Ok(logs.Select(a => new
            {
                a.Guid,
                a.EventType,
                a.Timestamp,
                a.UsuarioId,
                a.VisitanteId,
                a.InvitacionId,
                a.Metadata
            }));
        }

        // --- HikCentral ---

        [HttpGet("hikcentral/version")]
        public async Task<IActionResult> HikCentralVersion()
        {
            var version = await _hikCentral.ObtenerVersion();
            return Ok(new { version });
        }
    }
}
