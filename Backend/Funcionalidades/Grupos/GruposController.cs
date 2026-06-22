using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Grupos
{
    [ApiController]
    [Route("api/grupos")]
    [Authorize]
    public class GruposController : ControllerBase
    {
        private readonly GruposService _service;

        public GruposController(GruposService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> Listar([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var (grupos, hasMore) = await _service.ObtenerGrupos(page, pageSize);
            return Ok(new
            {
                data = grupos.Select(g => new
                {
                    g.Guid,
                    g.Nombre,
                    g.Descripcion,
                    cantidadMiembros = g.Miembros.Count,
                    creadoPor = g.CreadoPor != null ? $"{g.CreadoPor.Nombre} {g.CreadoPor.Apellido}" : "",
                    g.FechaCreacion
                }),
                page,
                pageSize,
                hasMore
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> ObtenerPorId(Guid id)
        {
            var grupo = await _service.ObtenerGrupoPorId(id);
            if (grupo == null)
                return NotFound(new { mensaje = "Grupo no encontrado" });

            return Ok(new
            {
                grupo.Guid,
                grupo.Nombre,
                grupo.Descripcion,
                miembros = grupo.Miembros.Select(m => new { m.Guid, m.Email, m.Telefono }),
                creadoPor = grupo.CreadoPor != null ? $"{grupo.CreadoPor.Nombre} {grupo.CreadoPor.Apellido}" : "",
                grupo.FechaCreacion
            });
        }

        [HttpPost]
        public async Task<IActionResult> Crear([FromBody] CrearGrupoRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Nombre))
                return BadRequest(new { mensaje = "El nombre del grupo es obligatorio" });
            if (request.Miembros.Count(m => !string.IsNullOrWhiteSpace(m.Email)) < 1)
                return BadRequest(new { mensaje = "El grupo debe tener al menos un miembro" });

            var usuarioId = ObtenerUsuarioId();
            var grupo = await _service.CrearGrupo(request, usuarioId);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = grupo.Guid }, new
            {
                grupo.Guid,
                grupo.Nombre,
                grupo.Descripcion,
                cantidadMiembros = grupo.Miembros.Count
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Actualizar(Guid id, [FromBody] ActualizarGrupoRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Nombre))
                return BadRequest(new { mensaje = "El nombre del grupo es obligatorio" });
            if (request.Miembros.Count(m => !string.IsNullOrWhiteSpace(m.Email)) < 1)
                return BadRequest(new { mensaje = "El grupo debe tener al menos un miembro" });

            var grupo = await _service.ActualizarGrupo(id, request);
            if (grupo == null)
                return NotFound(new { mensaje = "Grupo no encontrado" });

            return Ok(new { grupo.Guid, grupo.Nombre });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Eliminar(Guid id)
        {
            var eliminado = await _service.EliminarGrupo(id);
            if (!eliminado)
                return NotFound(new { mensaje = "Grupo no encontrado" });

            return NoContent();
        }

        private Guid ObtenerUsuarioId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return Guid.Parse(claim!.Value);
        }
    }
}
