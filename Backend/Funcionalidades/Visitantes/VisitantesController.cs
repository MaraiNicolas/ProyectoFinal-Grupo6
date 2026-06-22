using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ProyectoFinal_Grupo6.Api.Funcionalidades.Visitantes
{
    [ApiController]
    [Route("api/visitantes")]
    [Authorize]
    public class VisitantesController : ControllerBase
    {
        private readonly VisitantesService _service;

        public VisitantesController(VisitantesService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> Listar([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var (visitantes, hasMore) = await _service.ObtenerVisitantes(search, page, pageSize);

            return Ok(new
            {
                data = visitantes.Select(v => new
                {
                    v.Guid,
                    v.Nombre,
                    v.Apellido,
                    v.Email,
                    v.Telefono,
                    v.TipoDocumento,
                    v.NumeroDocumento
                }),
                page,
                pageSize,
                hasMore
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Eliminar(Guid id)
        {
            var eliminado = await _service.EliminarVisitante(id);
            if (!eliminado)
                return NotFound(new { mensaje = "Visitante no encontrado" });

            return NoContent();
        }
    }
}
