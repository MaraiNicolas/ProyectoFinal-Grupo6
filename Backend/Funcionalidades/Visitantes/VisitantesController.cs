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
        public async Task<IActionResult> Listar([FromQuery] string? search)
        {
            var visitantes = await _service.ObtenerVisitantes(search);

            return Ok(visitantes.Select(v => new
            {
                v.Guid,
                v.Nombre,
                v.Apellido,
                v.Email,
                v.Telefono,
                v.TipoDocumento,
                v.NumeroDocumento
            }));
        }
    }
}
